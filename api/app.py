from fastapi import FastAPI, Header, HTTPException
from datetime import datetime, timedelta
import os
import hmac
import hashlib
import base64
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

SECRET = os.getenv("DOWNLOAD_SIGNING_SECRET", "dev-secret")

def make_token(exp_minutes=5):
    exp = (datetime.utcnow() + timedelta(minutes=exp_minutes)).isoformat()
    msg = exp.encode()
    sig = hmac.new(SECRET.encode(), msg, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(msg + b"." + sig).decode()
    return token

def verify_token(token: str):
    raw = base64.urlsafe_b64decode(token.encode())
    msg, sig = raw.split(b".")
    expected = hmac.new(SECRET.encode(), msg, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected):
        return False
    if datetime.fromisoformat(msg.decode()) < datetime.utcnow():
        return False
    return True

@app.post("/download/sign")
def sign():
    return {"token": make_token()}

@app.get("/internal/verify-download")
def verify(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401)
    token = authorization.replace("Bearer ", "")
    if not verify_token(token):
        raise HTTPException(status_code=403)
    return {"ok": True}
