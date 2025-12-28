from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import sqlite3
import os
from pathlib import Path
import sqlite3

# ============================================================
# KFITER MVP - Auth Minimal (Register/Login/JWT/Me)
# - 목적: 결제/라이선스의 전 단계인 "계정 기반 인증"을 먼저 안정화
# - 특허 관점 메모:
#   1) 계정(사용자) 식별 + 토큰 기반 세션
#   2) 이후 "PC 기기지문/라이선스 서명"과 결합하여 인증 체계를 확장 가능
#   3) 서버 책임 최소화(토큰 발급/검증), 민감키는 서버에만 존재
# ============================================================

app = FastAPI(title="KFIT API", version="0.1")

# ---------------------------
# 환경설정(운영시 .env로 분리 권장)
# ---------------------------
SECRET_KEY = os.getenv("KFIT_SECRET_KEY", "CHANGE_ME_IN_ENV")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간

PROJECT_ROOT = Path(__file__).resolve().parent.parent   # .../kfit
DATA_DIR = Path(os.getenv("KFIT_DATA_DIR", str(PROJECT_ROOT / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "kfit.db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ---------------------------
# DB 유틸
# ---------------------------
BPROJECT_ROOT = Path(__file__).resolve().parent.parent   # .../kfit
DATA_DIR = Path(os.getenv("KFIT_DATA_DIR", str(PROJECT_ROOT / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "kfit.db"

def db_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)  # ★ 핵심: 폴더 자동 생성
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
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
    return pwd_context.verify(plain, hashed)

def hash_password(plain: str) -> str:
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

    conn = db_conn()
    cur = conn.cursor()
    pw_hash = hash_password(payload.password)
    created_at = datetime.utcnow().isoformat()

    cur.execute(
        "INSERT INTO users (email, pw_hash, name, created_at) VALUES (?, ?, ?, ?)",
        (payload.email, pw_hash, payload.name, created_at)
    )
    conn.commit()
    user_id = cur.lastrowid
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
