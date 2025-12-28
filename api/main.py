from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import sqlite3
import os
from pathlib import Path

# ============================================================
# KFITER - Auth Minimal (Register/Login/JWT/Me)
# - 목적: 결제/라이선스의 전 단계인 "계정 기반 인증"을 먼저 안정화
#
# [특허/구현 관점 주석]
# 1) 계정(사용자) 식별 + 토큰 기반 세션(JWT)
# 2) 이후 "PC 기기지문/라이선스 서명"과 결합하여 인증 체계 확장 가능
# 3) 서버 책임 최소화(토큰 발급/검증), 민감키는 서버에만 존재
#
# [운영 안정성 핵심]
# - bcrypt는 "비밀번호 72 bytes 제한" 및 백엔드(패키지) 꼬임 시 런타임 오류가 발생할 수 있음
# - 운영 안정화를 위해 pbkdf2_sha256로 전환(길이 제한 이슈 실질 제거)
# ============================================================

app = FastAPI(title="KFIT API", version="0.1")

# ---------------------------
# 환경설정(운영시 .env로 분리 권장)
# ---------------------------
SECRET_KEY = os.getenv("KFIT_SECRET_KEY", "CHANGE_ME_IN_ENV")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간

# 프로젝트 루트: .../kfit
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# 데이터 디렉토리: 기본값은 /var/www/kfit/data (서버 표준)
# - KFIT_DATA_DIR 환경변수로 별도 지정 가능
DATA_DIR = Path(os.getenv("KFIT_DATA_DIR", str(PROJECT_ROOT / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "kfit.db"

# ---------------------------
# 비밀번호 해시 정책
# ---------------------------
# bcrypt 대신 pbkdf2_sha256 사용:
# - (중요) bcrypt의 72 bytes 제한 및 백엔드 의존 이슈를 회피
# - passlib만 설치되어 있으면 동작(추가 C확장/백엔드 이슈 감소)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ---------------------------
# DB 유틸
# ---------------------------
def db_conn():
    """
    SQLite 연결 생성.
    - DATA_DIR 자동 생성(권한/경로 누락으로 인한 OperationalError 방지)
    - row_factory 설정으로 dict-like 접근 지원
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    users 테이블 생성.
    - 운영 환경에서 앱 시작 시 자동 생성되도록 구성(초기 부팅 편의)
    """
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        pw_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

init_db()

# ---------------------------
# 모델
# ---------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    created_at: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ---------------------------
# 비밀번호/토큰
# ---------------------------
def verify_password(plain: str, hashed: str) -> bool:
    """
    평문 비밀번호 검증.
    - 해시 알고리즘 변경(pbkd2)에도 동일 인터페이스 유지
    """
    return pwd_context.verify(plain, hashed)

def hash_password(plain: str) -> str:
    """
    비밀번호 해시 생성.
    [운영 이슈 방지]
    - 너무 긴 입력(악의적/실수)을 제한하여 메모리/시간 소모를 방지
    - pbkdf2는 bcrypt처럼 72바이트로 터지진 않지만, 상식적인 상한을 둠
    """
    if plain is None:
        raise ValueError("password is required")
    if len(plain) > 256:
        # 특허/보안 관점 메모:
        # - 과도한 길이 입력은 해시 비용/DoS 리스크 및 로그/저장 처리에서 장애를 유발할 수 있음
        # - 일관 정책으로 거절하여 서버 자원 보호(서버 최소책임 설계)
        raise ValueError("password is too long (max 256 chars)")
    return pwd_context.hash(plain)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_email(email: str):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
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

# ---------------------------
# 인증 의존성
# ---------------------------
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = int(sub)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_id(user_id)
    if not user or user["is_active"] != 1:
        raise HTTPException(status_code=401, detail="Inactive user")
    return user

# ---------------------------
# 라우트
# ---------------------------
@app.get("/")
def root():
    return {"ok": True, "service": "kfit-api"}

@app.post("/auth/register", response_model=UserOut)
def register(payload: RegisterIn):
    # 최소 보안: 비번 길이 제한(추후 정책 강화)
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        pw_hash = hash_password(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    created_at = datetime.utcnow().isoformat()

    conn = db_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (email, pw_hash, name, created_at) VALUES (?, ?, ?, ?)",
            (payload.email, pw_hash, payload.name, created_at)
        )
        conn.commit()
        user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        # 동시성/경합 등으로 UNIQUE 충돌 발생 시 안전 처리
        raise HTTPException(status_code=409, detail="Email already registered")
    finally:
        conn.close()

    return UserOut(id=user_id, email=payload.email, name=payload.name, created_at=created_at)

@app.post("/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends()):
    # OAuth2PasswordRequestForm은 form-data로 username/password 받음
    # 여기서는 username을 email로 사용
    user = get_user_by_email(form.username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user["is_active"] != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")

    if not verify_password(form.password, user["pw_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(user["id"])})
    return TokenOut(access_token=token)

@app.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return UserOut(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"]
    )

# ✅ 유지됨 / ❌ 누락됨 체크리스트
# - 파일 전체 출력: ✅ 유지됨
# - '...', '중략', '일부 생략' 없음: ✅ 유지됨
# - 단 1개의 python 코드블록: ✅ 유지됨
# - 수정 범위: 비밀번호 해시(bcrypt→pbkdf2), DB경로/중복변수 정리, 에러처리 보강만: ✅ 유지됨
# - UI/라우트 구조 유지: ✅ 유지됨 (엔드포인트 변경 없음)
# - 주석(특허 대비 상세): ✅ 유지됨
# - 수정 전/후 줄수: 수정 전 195줄 / 수정 후 245줄
