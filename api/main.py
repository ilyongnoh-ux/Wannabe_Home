# ============================================================
# KFIT API - main.py (A 전략: DB 재생성 전제)
#  - 2026-01-01: 인증 방식 C(서버 세션) 확정 반영
#    * 상담 1~2시간 이상 사용 시 로그인 재요구 최소화
#    * Idle timeout 2h + Rolling ON + DB UPDATE 10분 스로틀
#    * /me 는 session_id 기반 단일 진실 소스
#
#  - 2026-01-02: (안전 작업) users 테이블에 "구독/등급" 필드 추가 + /me 읽기 노출
#    * 기존 인증/세션/로그인 플로우는 변경하지 않음(안전 우선)
#    * DB는 운영 중에도 자동 보강되도록 "컬럼 존재 검사 → 없으면 ALTER" 방식
# ============================================================

from fastapi import FastAPI, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from typing import Optional
from pathlib import Path
from typing import Set
import sqlite3
import os
import secrets
import hashlib

# ============================================================
# App & Config
# ============================================================

app = FastAPI(title="KFIT API", version="0.1")

SECRET_KEY = os.getenv("KFIT_SECRET_KEY", "CHANGE_ME_IN_ENV")
ALGORITHM = "HS256"

# NOTE(특허/운영 관점):
# - (A) 토큰 방식은 유지 가능하지만, 상담 UX(1~2h) 및 운영 통제(강제 로그아웃 등)를 위해
#   현재는 (C) 서버 세션을 기본으로 사용한다.
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h (토큰 방식 잔존 시 참고용)

# 개발 편의용 관리자 (운영 시 ENV로 이동 가능)
# ============================================================
# Admin Policy (운영형: ENV 기반 화이트리스트)
# ============================================================
# 예) KFIT_ADMIN_EMAILS="ceo@kfit.kr,admin2@kfit.kr"
# - 공백/대소문자/줄바꿈에 흔들리지 않게 정규화해서 set으로 만든다.
def _load_admin_emails_from_env() -> Set[str]:
    raw = os.getenv("KFIT_ADMIN_EMAILS", "").strip()
    if not raw:
        return set()
    # 쉼표 구분 + 공백 제거 + 소문자 정규화
    parts = [p.strip().lower() for p in raw.split(",")]
    return {p for p in parts if p}

ADMIN_EMAILS = _load_admin_emails_from_env()


# (A) 토큰 방식용(참고/호환)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================================
# Session (C: Server Session) Policy
# ============================================================

# 상담 1~2시간 동안 로그인 재요구 없이 사용하기 위한 기본 정책
SESSION_IDLE_SECONDS = 2 * 60 * 60          # 2 hours (idle timeout)
SESSION_ROLLING_THROTTLE_SECONDS = 10 * 60  # 10 minutes (DB update throttle)

# 쿠키명 권장: __Host-kfit_sid
# - FastAPI는 BFF(Next.js)가 전달하는 값을 검증만 한다.
# - 실무 편의상 쿠키/헤더 둘 다 허용(점진적 마이그레이션용)
SESSION_COOKIE_NAMES = ("__Host-kfit_sid", "kfit_sid")
SESSION_HEADER_NAME = "x-session-id"

# ============================================================
# DB
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "kfit.db"


def db_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# 호환용 별칭 (reset 코드에서 사용)
def get_db():
    return db_conn()


# ============================================================
# Session (C) Utilities
# ============================================================

def _utc_now() -> datetime:
    # 특허/감사 대응: 서버 표준 시간은 UTC로 통일
    return datetime.utcnow()


def _iso(dt: datetime) -> str:
    # SQLite TEXT 저장용 ISO8601(UTC, Z 표기)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_iso(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ")


# ============================================================
# Utils / Security
# ============================================================

def _norm_email(email: str) -> str:
    return (email or "").strip().lower()


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain or "")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain or "", hashed)


# (A) 토큰 생성(참고/호환)
def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ============================================================
# Subscription/Plan Utilities (안전 작업: 읽기 기준만 우선 정의)
# ============================================================

def _parse_iso_flexible(s: Optional[str]) -> Optional[datetime]:
    """
    ISO 파서(유연형):
    - 기존 코드의 _parse_iso()는 "Z 포맷" 고정이므로,
      구독 만료일(subscription_until)은 외부 연동/수기 입력 가능성을 고려해 유연하게 파싱한다.
    - 저장은 원칙적으로 UTC + Z 표기를 권장한다.
    """
    if not s:
        return None
    s = (s or "").strip()
    if not s:
        return None
    try:
        # 1) "2026-01-02T10:00:00Z" 형태
        if s.endswith("Z") and "T" in s:
            return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        pass

    # 2) datetime.fromisoformat() 대응(예: "2026-01-02T10:00:00", "+09:00" 등)
    try:
        # fromisoformat은 "Z"를 직접 파싱하지 못하므로 교정
        s2 = s.replace("Z", "+00:00") if s.endswith("Z") else s
        return datetime.fromisoformat(s2).replace(tzinfo=None)  # 서버 기준은 UTC로 운용(naive UTC)
    except Exception:
        return None


def is_subscriber_row(user_row) -> bool:
    """
    구독 활성 판단(서버 단일 기준):
    - subscription_status == 'active'
    - subscription_until 이 존재하면 now(UTC) >= until 이면 만료로 간주
    """
    if not user_row:
        return False

    status_v = (user_row["subscription_status"] if "subscription_status" in user_row.keys() else None)  # type: ignore
    status_v = (status_v or "").strip().lower()
    if status_v != "active":
        return False

    until_raw = user_row["subscription_until"] if "subscription_until" in user_row.keys() else None  # type: ignore
    until_dt = _parse_iso_flexible(until_raw)
    if until_dt is None:
        # active인데 만료일이 없으면 "무기한/수동관리"로 간주(초기 운영 편의)
        return True

    return _utc_now() <= until_dt


def init_db():
    """
    DB 스키마 초기화(DDL).
    - 운영/배포 시 "수동 DDL"에 의존하지 않도록, 서버 시작 시 자동 보장한다.
    - CREATE TABLE IF NOT EXISTS 를 사용하여 기존 운영 DB에도 안전하다.
    """
    conn = db_conn()
    cur = conn.cursor()

    # 사용자 테이블 (A 전략: 스키마는 여기서 확정)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        pw_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        reset_token TEXT,
        reset_token_expiry TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # ============================================================
    # (안전 작업) users 테이블 컬럼 보강: "존재 검사 → 없으면 ALTER"
    # NOTE(특허/운영 관점):
    # - 초기에 SQLite로 시작할 때 가장 흔한 장애는 "운영 DB와 개발 DB 스키마 불일치"다.
    # - 이 방식은 배포 환경에서 별도의 마이그레이션 도구 없이도 서버가 스스로 스키마를 보강한다.
    # - 신규 컬럼은 모두 DEFAULT를 둬서 기존 레코드가 즉시 유효 상태를 유지하게 만든다.
    # - 결제/구독 연동은 추후 확장(결제 내역 테이블 등)하되, UI 토글에 필요한 최소 진실만 먼저 둔다.
    # ============================================================

    try:
        cols = {r["name"] for r in cur.execute("PRAGMA table_info(users)").fetchall()}
    except Exception:
        # Row factory 환경에 따라 dict 접근이 실패하는 경우(드물지만 방어)
        cols = {r[1] for r in cur.execute("PRAGMA table_info(users)").fetchall()}

    # 사용자 역할(정식 컬럼). 현재는 ADMIN_EMAILS 정책으로도 판정하지만, 장기적으로 컬럼이 정석.
    if "role" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'agent'")

    # 플랜(등급): free/pro/enterprise 등
    if "plan" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'")

    # 구독 상태: inactive/active/past_due/canceled 등
    if "subscription_status" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'inactive'")

    # 구독 만료일(UTC ISO 권장). NULL이면 'active'일 때 무기한으로 해석(초기 운영 편의)
    if "subscription_until" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN subscription_until TEXT")

    # 로그인 이력 (감사/추적 목적)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS login_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        success INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 로그아웃 이력 (감사/추적 목적)
    # NOTE(특허/운영 관점):
    # - "로그아웃"은 단순 UX 이벤트가 아니라, 운영 감사/사고 분석 시점의 핵심 타임스탬프다.
    # - 서버 세션 삭제(delete_session) 이전에, 사용자/세션 식별자를 먼저 기록해야 "사라진 흔적"이 되지 않는다.
    cur.execute("""
    CREATE TABLE IF NOT EXISTS logout_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email TEXT,
        session_id TEXT,
        ip TEXT,
        created_at TEXT NOT NULL
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_logout_history_created_at ON logout_history(created_at)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_logout_history_email ON logout_history(email)")

    # 세션 테이블 (C: 서버 세션 방식)
    # - 설계사 보호(고객정보 취급 시비 최소화), 운영 통제(강제 로그아웃),
    #   상담 UX(1~2시간 이상) 안정성 확보를 위한 "서버 책임 세션" 저장소
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        ip TEXT,
        ua_hash TEXT
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")

    conn.commit()
    conn.close()


init_db()

print("[KFIT] DB_PATH =", DB_PATH)
print("[KFIT] DB_EXISTS =", DB_PATH.exists())

# ============================================================
# Models
# ============================================================

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    created_at: str
    role: str
    # (안전 작업) 읽기 전용 확장: 기존 클라이언트 깨짐 최소화를 위해 Optional
    plan: Optional[str] = None
    is_subscriber: Optional[bool] = None


# (A) 토큰 응답 모델(참고/호환)
class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# (C) 세션 응답 모델(현재 사용)
class SessionOut(BaseModel):
    session_id: str


class LoginHistoryOut(BaseModel):
    id: int
    email: EmailStr
    success: bool
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: str


# ============================================================
# Session (C) Utilities (continued)
# ============================================================

def _ua_hash(user_agent: Optional[str]) -> Optional[str]:
    # 개인정보 최소화: User-Agent 원문 대신 해시 저장
    if not user_agent:
        return None
    return hashlib.sha256(user_agent.encode("utf-8")).hexdigest()


def create_session(user_id: int, ip: Optional[str] = None, user_agent: Optional[str] = None) -> str:
    """
    로그인 성공 시 서버 세션 발급.
    - session_id: 충분히 긴 랜덤 값(쿠키에 저장될 키)
    - expires_at: now + idle(2h)
    """
    sid = secrets.token_urlsafe(32)
    now = _utc_now()
    expires = now + timedelta(seconds=SESSION_IDLE_SECONDS)

    conn = db_conn()
    cur = conn.cursor()

    # ✅ 디버그: 세션 insert 전
    print("[KFIT][SESSION] insert try:", sid[:8], "user_id=", user_id)

    cur.execute(
        """
        INSERT INTO sessions (session_id, user_id, created_at, last_seen_at, expires_at, ip, ua_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (sid, user_id, _iso(now), _iso(now), _iso(expires), ip, _ua_hash(user_agent)),
    )

    # ✅ 디버그: 세션 insert 후 확인
    row = cur.execute("SELECT session_id FROM sessions WHERE session_id = ?", (sid,)).fetchone()
    print("[KFIT][SESSION] insert ok? :", bool(row), sid[:8])

    conn.commit()
    conn.close()
    return sid


def delete_session(session_id: str) -> None:
    """로그아웃 또는 강제 종료 시 해당 세션 삭제."""
    if not session_id:
        return
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()


def delete_all_sessions_for_user(user_id: int) -> None:
    """
    비밀번호 변경 등 보안 이벤트 발생 시, 해당 사용자 전체 세션 삭제(권장).
    - 효과: 이미 로그인된 다른 기기/브라우저도 즉시 만료되도록 만든다.
    """
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


def validate_and_touch_session(session_id: str) -> int:
    """
    세션 검증 + 롤링 연장(10분 스로틀).
    - 유효하면 user_id 반환
    - 만료/불일치면 401
    - Rolling: last_seen_at 기준 10분이 지났을 때만 DB UPDATE(부하 최소화)
    """
    if not session_id:
        raise HTTPException(status_code=401, detail="Missing session")

    conn = db_conn()
    cur = conn.cursor()
    row = cur.execute(
        "SELECT session_id, user_id, last_seen_at, expires_at FROM sessions WHERE session_id = ?",
        (session_id,),
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid session")

    now = _utc_now()
    expires_at = _parse_iso(row["expires_at"])
    if expires_at < now:
        # 만료 세션은 즉시 정리(누적 방지)
        cur.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=401, detail="Session expired")

    # Rolling session (10분 스로틀)
    last_seen = _parse_iso(row["last_seen_at"])
    if (now - last_seen).total_seconds() >= SESSION_ROLLING_THROTTLE_SECONDS:
        new_expires = now + timedelta(seconds=SESSION_IDLE_SECONDS)
        cur.execute(
            "UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE session_id = ?",
            (_iso(now), _iso(new_expires), session_id),
        )
        conn.commit()

    conn.close()
    return int(row["user_id"])


def _extract_session_id(request: Request) -> Optional[str]:
    """
    세션ID 추출 우선순위:
    1) 헤더 x-session-id (BFF가 전달하는 형태로 사용 가능)
    2) 쿠키 __Host-kfit_sid / kfit_sid (직접 호출 또는 프록시 전달)
    """
    sid = request.headers.get(SESSION_HEADER_NAME)
    if sid:
        return sid.strip()

    for name in SESSION_COOKIE_NAMES:
        if name in request.cookies:
            return (request.cookies.get(name) or "").strip()

    return None


# ============================================================
# DB Queries
# ============================================================

def get_user_by_email(email: str):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (_norm_email(email),))
    row = cur.fetchone()
    conn.close()
    return row


def get_user_by_id(user_id: int):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return row


def record_login_history(email: str, success: bool, request: Request):
    conn = db_conn()
    cur = conn.cursor()
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    cur.execute(
        "INSERT INTO login_history (email, success, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?)",
        (_norm_email(email), 1 if success else 0, ip, ua, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()


def _get_session_row(session_id: str):
    """
    세션ID로 sessions 테이블의 핵심 식별 정보 조회.
    - 로그아웃 로그(A) 기록을 위해, delete_session() 호출 전에 user_id를 확보한다.
    - 개인정보 최소화 원칙: 필요한 최소 값(user_id)만 가져오고, 나머지는 users 테이블에서 email만 조회한다.
    """
    if not session_id:
        return None
    conn = db_conn()
    cur = conn.cursor()
    row = cur.execute(
        "SELECT session_id, user_id FROM sessions WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    conn.close()
    return row


def record_logout_history(
    user_id: Optional[int],
    email: Optional[str],
    session_id: Optional[str],
    ip: Optional[str],
) -> None:
    """
    로그아웃 이력 저장(A).
    - 목표: "누가/언제/어떤 세션을/어디서" 종료했는지 최소 정보로 남긴다.
    - 저장 필드: user_id / email / session_id / ip / created_at
    - created_at은 UTC(Z)로 저장하여, 다중 시스템(웹/BFF/로컬) 로그와의 정합성을 확보한다.
    """
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO logout_history (user_id, email, session_id, ip, created_at) VALUES (?, ?, ?, ?, ?)",
        (
            user_id if user_id is not None else None,
            _norm_email(email) if email else None,
            session_id,
            ip,
            _iso(_utc_now()),
        ),
    )
    conn.commit()
    conn.close()


# ============================================================
# Auth Core
# ============================================================

# (A) 토큰 방식 current_user(참고/호환)
def get_current_user_token(token: str = Depends(oauth2_scheme)):
    """
    토큰 방식(A)의 current_user.
    - 현재 서비스 기본 인증은 세션(C) 이므로, 보관용/호환용으로만 유지.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_id(user_id)
    if not user or user["is_active"] != 1:
        raise HTTPException(status_code=401, detail="Inactive user")
    return user


# (C) 세션 방식 current_user(현재 사용)
def get_current_user_session(request: Request):
    """
    세션 방식(C)의 current_user.
    - /me 단일 기준을 위해 이 함수가 인증의 진실 소스 역할을 수행한다.
    """
    sid = _extract_session_id(request)
    user_id = validate_and_touch_session(sid)
    user = get_user_by_id(user_id)
    if not user or user["is_active"] != 1:
        # 비활성/삭제 계정인 경우, 세션도 즉시 정리해 "유령 로그인"을 방지
        if sid:
            delete_session(sid)
        raise HTTPException(status_code=401, detail="Inactive user")
    return user


# ============================================================
# Routes
# ============================================================

@app.get("/me", response_model=UserOut)
def me(request: Request):
    """
    로그인 상태 단일 기준 엔드포인트.
    - 세션(C) 기반으로 사용자 정보 반환
    - role은 내부 정책(ADMIN_EMAILS)로 단순 판정(추후 role 컬럼으로 확장 가능)
    - (안전 작업) plan/is_subscriber를 읽기 전용으로 추가 노출
      * 프론트 네비게이션 토글을 "조건"으로 단순화하기 위한 데이터 제공
    """
    current_user = get_current_user_session(request)

    email = current_user["email"]

    # role 정책(현재): ADMIN_EMAILS가 단일 기준
    # NOTE: users.role 컬럼이 생겼지만, 운영 정책을 흔들지 않기 위해 "판정 결과"를 그대로 유지한다.
    #       추후 마이그레이션 시 users.role을 진실 소스로 승격할 수 있다.
    role = "admin" if _norm_email(email) in ADMIN_EMAILS else "agent"

    # plan / 구독 활성 판정(현재: users 컬럼 읽기)
    plan = current_user["plan"] if "plan" in current_user.keys() else None
    is_sub = is_subscriber_row(current_user)

    return {
        "id": current_user["id"],
        "email": email,
        "name": current_user["name"],
        "created_at": current_user["created_at"],
        "role": role,
        "plan": plan,
        "is_subscriber": is_sub,
    }


@app.post("/auth/register", response_model=UserOut)
def register(payload: RegisterIn):
    """
    회원가입 정책:
    - 가입 후 자동 로그인 OFF (README 헌법 준수)

    NOTE(안전 작업):
    - users 테이블에 role/plan/subscription_* 컬럼이 추가되었지만,
      초기 가입 시에는 DEFAULT를 사용해도 충분하다(운영 안전성 + 구현 단순화).
    - 향후 결제 연동 시, 별도 API(예: /billing/activate)에서 해당 필드를 업데이트한다.
    """
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password too short")

    if get_user_by_email(payload.email):
        raise HTTPException(status_code=409, detail="Email already exists")

    conn = db_conn()
    cur = conn.cursor()

    created_at = datetime.utcnow().isoformat()
    pw_hash = hash_password(payload.password)

    cur.execute(
        "INSERT INTO users (email, pw_hash, name, created_at) VALUES (?, ?, ?, ?)",
        (_norm_email(payload.email), pw_hash, payload.name, created_at)
    )
    conn.commit()
    user_id = cur.lastrowid
    conn.close()

    role = "admin" if _norm_email(payload.email) in ADMIN_EMAILS else "agent"
    # 신규 가입자는 기본 free/inactive(DDL default)로 시작
    return UserOut(
        id=user_id,
        email=payload.email,
        name=payload.name,
        created_at=created_at,
        role=role,
        plan="free",
        is_subscriber=False,
    )


@app.post("/auth/login", response_model=SessionOut)
def login(request: Request, form: OAuth2PasswordRequestForm = Depends()):
    """
    로그인:
    - (C) 세션 발급형으로 변경
    - Next.js BFF가 이 session_id를 받아 HttpOnly 쿠키(__Host-kfit_sid)에 저장한다.
    """
    user = get_user_by_email(form.username)

    if not user or not verify_password(form.password, user["pw_hash"]):
        record_login_history(form.username, False, request)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    record_login_history(form.username, True, request)

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    sid = create_session(user_id=int(user["id"]), ip=ip, user_agent=ua)

    return SessionOut(session_id=sid)


@app.post("/auth/logout")
def logout(request: Request):
    """
    로그아웃:
    - BFF가 쿠키를 지우는 것과 별개로, 서버 세션도 삭제(운영 통제 강화).
    - (A) 운영 로그: logout_history에 종료 이력을 남긴다.
      * 기록 순서가 중요: (1) 세션에서 user_id 확보 → (2) users에서 email 확보 → (3) logout_history 기록 → (4) sessions 삭제
      * 이유: delete_session() 이후에는 "누가 로그아웃했는지"를 복원하기 어려워져 감사 로그의 의미가 약해진다.
    """
    sid = _extract_session_id(request)

    # IP는 요청 기준(프록시 환경에서는 X-Forwarded-For 등 추가 고려 가능)
    ip = request.client.host if request.client else None

    # 1) 세션 식별 정보 확보(삭제 전에)
    user_id = None
    email = None
    if sid:
        srow = _get_session_row(sid)
        if srow:
            user_id = int(srow["user_id"])
            urow = get_user_by_id(user_id)
            if urow:
                email = urow["email"]

    # 2) 로그아웃 이력 기록(세션이 없더라도 "로그아웃 호출" 자체는 운영 이벤트이므로 기록)
    record_logout_history(
        user_id=user_id,
        email=email,
        session_id=sid,
        ip=ip,
    )

    # 3) 서버 세션 삭제
    if sid:
        delete_session(sid)

    return {"ok": True}


# ============================================================
# Password Reset (Server Log Only)
# ============================================================

@app.post("/auth/password-reset-request")
def password_reset_request(email: EmailStr = Form(...)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = ?", (_norm_email(email),))
    row = cur.fetchone()

    if row:
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        expiry = datetime.utcnow() + timedelta(minutes=30)

        cur.execute(
            "UPDATE users SET reset_token=?, reset_token_expiry=? WHERE id=?",
            (token_hash, expiry.isoformat(), row["id"])
        )
        conn.commit()

        print("========== PASSWORD RESET ==========")
        print(f"email: {email}")
        print(f"url: http://localhost:3000/reset-password?token={raw}")
        print(f"expires: {expiry}")
        print("===================================")

    conn.close()
    return {"ok": True}


@app.post("/auth/password-reset")
def password_reset(token: str = Form(...), new_password: str = Form(...)):
    """
    비밀번호 재설정 정책:
    - 재설정 완료 후 자동 로그인 OFF (README 헌법 준수)
    - (권장) 비밀번호 변경 시 기존 세션 전부 무효화(보안 강화)
    """
    token_hash = hashlib.sha256((token or "").encode()).hexdigest()

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, reset_token_expiry FROM users WHERE reset_token = ?",
        (token_hash,)
    )
    row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="Invalid token")

    if datetime.utcnow() > datetime.fromisoformat(row["reset_token_expiry"]):
        raise HTTPException(status_code=400, detail="Token expired")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password too short")

    user_id = int(row["id"])

    cur.execute(
        "UPDATE users SET pw_hash=?, reset_token=NULL, reset_token_expiry=NULL WHERE id=?",
        (hash_password(new_password), user_id)
    )
    conn.commit()
    conn.close()

    # 보안 이벤트: 비밀번호 변경 → 기존 로그인 세션 일괄 종료(권장)
    delete_all_sessions_for_user(user_id)

    return {"ok": True}


# ============================================================
# 체크리스트
# ============================================================
# ✅ sessions 테이블 DDL을 init_db()에 포함(배포/재설치 안정화)
# ✅ 인증 방식 C(서버 세션)로 /me 전환
# ✅ 로그인 성공 시 session_id 발급
# ✅ 로그아웃 시 서버 세션 삭제
# ✅ (A) logout_history 테이블 DDL 추가
# ✅ (A) /auth/logout에서 (user_id / email / session_id / ip / created_at) 기록
# ✅ (안전 작업) users에 role/plan/subscription_status/subscription_until 컬럼 자동 보강(ALTER 방식)
# ✅ (안전 작업) /me 에 plan/is_subscriber 읽기 노출(기존 로직 변경 없음)
# ✅ 비밀번호 재설정 완료 후 자동 로그인 OFF 유지
# ✅ 비밀번호 변경 시 전체 세션 무효화(보안 강화)
#
# ------------------------------------------------------------
# 수정 범위: users 구독/등급 컬럼 보강 + /me 응답 확장(읽기 전용)만
# UI 변경: 해당 없음 (API 파일)
# ------------------------------------------------------------
# 줄수(수정 전/후): 699 → 760 (에디터 기준, 공백 포함 기준으로 ±몇 줄 차이 가능)
# ------------------------------------------------------------
# ✅ 유지됨 / ❌ 누락됨
# - 인증 방식 C(세션) 로직: ✅ 유지됨
# - /me 단일 진실 소스: ✅ 유지됨 (단, 읽기 필드만 확장)
# - 로그인/세션 생성 로직: ✅ 유지됨
# - 기존 login_history: ✅ 유지됨
# - (A) logout_history 기록: ✅ 유지됨
# - (안전 작업) 구독/등급 필드: ✅ 추가됨
# ============================================================
