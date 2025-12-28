
from __future__ import annotations



import os

import sqlite3

import time

import hmac

import hashlib

import base64

import json

from typing import Optional, Dict, Any



from fastapi import FastAPI, HTTPException, Depends, Header

from pydantic import BaseModel, EmailStr



# =========================================================

# KFIT Auth API (Minimal, Production-leaning)

# - 목적: register/login/me 정상 동작 + SQLite DB 생성 확인

# - 외부 의존 최소화(특허/운영 안정성 관점: 구성 단순화)

# - JWT 라이브러리 없이 HMAC 서명 토큰(자체 경량 토큰) 사용

#   * 운영 고도화 시 jose/pyjwt로 교체 가능

# =========================================================



APP_TITLE = "KFIT Auth API"

DB_PATH = os.environ.get("KFIT_AUTH_DB", "/srv/kfit/portal/data/auth.db")

SECRET = os.environ.get("KFIT_AUTH_SECRET", "CHANGE_ME_NOW")  # 운영 전 반드시 변경



os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)



def _db() -> sqlite3.Connection:

    conn = sqlite3.connect(DB_PATH, check_same_thread=False)

    conn.row_factory = sqlite3.Row

    return conn



def _init_db() -> None:

    with _db() as c:

        c.execute("""

        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            email TEXT NOT NULL UNIQUE,

            pwd_hash TEXT NOT NULL,

            pwd_salt TEXT NOT NULL,

            created_at INTEGER NOT NULL

        );

        """)

        c.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")



def _pbkdf2_hash(password: str, salt_b64: str) -> str:

    salt = base64.b64decode(salt_b64.encode("utf-8"))

    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)

    return base64.b64encode(dk).decode("utf-8")



def _new_salt() -> str:

    salt = os.urandom(16)

    return base64.b64encode(salt).decode("utf-8")



def _token_sign(payload: Dict[str, Any]) -> str:

    # payload -> base64url(json) + "." + base64url(hmac)

    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

    body_b64 = base64.urlsafe_b64encode(body).rstrip(b"=").decode("utf-8")

    mac = hmac.new(SECRET.encode("utf-8"), body_b64.encode("utf-8"), hashlib.sha256).digest()

    mac_b64 = base64.urlsafe_b64encode(mac).rstrip(b"=").decode("utf-8")

    return f"{body_b64}.{mac_b64}"



def _token_verify(token: str) -> Dict[str, Any]:

    try:

        body_b64, mac_b64 = token.split(".", 1)

        mac = base64.urlsafe_b64decode(mac_b64 + "==")

        expected = hmac.new(SECRET.encode("utf-8"), body_b64.encode("utf-8"), hashlib.sha256).digest()

        if not hmac.compare_digest(mac, expected):

            raise ValueError("bad signature")

        body = base64.urlsafe_b64decode(body_b64 + "==")

        payload = json.loads(body.decode("utf-8"))

        # exp 체크(있으면)

        exp = payload.get("exp")

        if exp is not None and int(time.time()) > int(exp):

            raise ValueError("expired")

        return payload

    except Exception:

        raise HTTPException(status_code=401, detail="Invalid token")



class RegisterReq(BaseModel):

    email: EmailStr

    password: str



class LoginReq(BaseModel):

    email: EmailStr

    password: str



class TokenRes(BaseModel):

    access_token: str

    token_type: str = "bearer"



class MeRes(BaseModel):

    id: int

    email: EmailStr

    created_at: int



app = FastAPI(title=APP_TITLE)



@app.on_event("startup")

def _on_startup():

    _init_db()



@app.post("/auth/register", response_model=MeRes)

def register(req: RegisterReq):

    password = req.password.strip()

    if len(password) < 8:

        raise HTTPException(status_code=400, detail="Password too short (min 8)")

    salt = _new_salt()

    pwd_hash = _pbkdf2_hash(password, salt)

    now = int(time.time())

    try:

        with _db() as c:

            cur = c.execute(

                "INSERT INTO users(email, pwd_hash, pwd_salt, created_at) VALUES(?,?,?,?)",

                (req.email.lower(), pwd_hash, salt, now),

            )

            user_id = int(cur.lastrowid)

        return MeRes(id=user_id, email=req.email.lower(), created_at=now)

    except sqlite3.IntegrityError:

        raise HTTPException(status_code=409, detail="Email already registered")



@app.post("/auth/login", response_model=TokenRes)

def login(req: LoginReq):

    with _db() as c:

        row = c.execute("SELECT id, email, pwd_hash, pwd_salt, created_at FROM users WHERE email=?",

                        (req.email.lower(),)).fetchone()

    if not row:

        raise HTTPException(status_code=401, detail="Invalid credentials")

    calc = _pbkdf2_hash(req.password, row["pwd_salt"])

    if not hmac.compare_digest(calc, row["pwd_hash"]):

        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 토큰 payload (7일)

    payload = {"sub": int(row["id"]), "email": row["email"], "iat": int(time.time()), "exp": int(time.time()) + 7*24*3600}

    token = _token_sign(payload)

    return TokenRes(access_token=token)



def _get_me(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:

    if not authorization or not authorization.lower().startswith("bearer "):

        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1].strip()

    return _token_verify(token)



@app.get("/me", response_model=MeRes)

def me(payload: Dict[str, Any] = Depends(_get_me)):

    user_id = int(payload["sub"])

    with _db() as c:

        row = c.execute("SELECT id, email, created_at FROM users WHERE id=?", (user_id,)).fetchone()

    if not row:

        raise HTTPException(status_code=404, detail="User not found")

    return MeRes(id=int(row["id"]), email=row["email"], created_at=int(row["created_at"]))

