from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User

# ------------------------------------------------------------
# 기존 auth_app.py의 토큰 검증 함수를 "그대로" 재사용한다.
# - auth_app.py는 별도 FastAPI app을 갖고 있어도 상관없다.
# - 우리는 그 안의 _token_verify(payload 추출)만 가져다 쓴다.
# ------------------------------------------------------------
from auth_app import _token_verify  # noqa: E402


def _extract_bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    return authorization.split(" ", 1)[1].strip()


def get_current_user(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
) -> User:
    """
    ✅ 현재 사용자 로딩(기존 auth 토큰 기반)

    동작:
    1) Authorization: Bearer <token> 에서 토큰 추출
    2) auth_app._token_verify()로 payload 검증(+exp 체크)
    3) payload.email 기준으로 우리 운영 DB(users)에서 사용자 조회
    4) 없으면 "최소 기본값"으로 자동 생성(초기 운영 편의)
       - plan=advance, role=user, subscription_status=active
       - created_at=now, last_login_at=now

    ⚠️ 이 자동 생성은 초기 단계 운영 편의용이며,
       추후 회원가입/프로비저닝 흐름이 정리되면
       "미존재 시 403"으로 바꿔도 된다(정책 선택).
    """
    token = _extract_bearer(authorization)
    payload = _token_verify(token)

    email = str(payload.get("email", "")).lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload (missing email)")

    user = db.query(User).filter(User.email == email).one_or_none()
    now = datetime.utcnow()

    if user is None:
        # ------------------------------------------------------------
        # 초기 연동 정책:
        # - auth.db에는 로그인 가능한 계정이 있지만
        #   운영 DB(users)에 plan/role/status가 아직 없을 수 있다.
        # - 그래서 첫 접근 시 자동 생성(운영 편의).
        # ------------------------------------------------------------
        import uuid

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=None,
            role="user",
            plan="advance",
            subscription_status="active",
            subscription_end_at=None,
            created_at=now,
            last_login_at=now,
            last_verified_at=None,
            offline_grace_days=7,
            offline_grace_expires_at=None,
            suspended_reason=None,
            suspended_at=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    # last_login_at 업데이트(선택: 너무 잦으면 끌 수도 있음)
    user.last_login_at = now
    db.commit()
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user


def require_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin role required")
    return user
