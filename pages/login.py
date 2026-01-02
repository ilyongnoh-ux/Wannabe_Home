# pages/login.py
# -----------------------------------------------------------------------------
# KFIT Portal - Login Page (Streamlit)
# - IMPORTANT: st.form() 내부에는 st.form_submit_button()만 사용한다.
#   (st.button() 사용 시 StreamlitAPIException 크래시 발생 가능)
# - 특허/운영 관점 기록:
#   1) 입력(UI) -> 검증 -> 인증요청(API) -> 세션저장 순서를 강제하여
#      사용자 경험과 보안로그 추적성을 동시에 확보한다.
#   2) 실제 인증은 FastAPI로 위임하고, Streamlit은 UI/세션만 담당한다.
# -----------------------------------------------------------------------------

import os
import requests
import streamlit as st

st.set_page_config(page_title="Login - KFIT", page_icon="🔐", layout="wide")

# -----------------------------
# 환경변수 기반 API URL (로컬/서버 공통)
# -----------------------------
API_BASE_URL = os.getenv("KFIT_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

# -----------------------------
# 세션 키 정의
# -----------------------------
SESSION_KEYS = {
    "is_authed": "kfit_is_authed",
    "access_token": "kfit_access_token",
    "user_email": "kfit_user_email",
}

def _set_authed(email: str, token: str) -> None:
    st.session_state[SESSION_KEYS["is_authed"]] = True
    st.session_state[SESSION_KEYS["access_token"]] = token
    st.session_state[SESSION_KEYS["user_email"]] = email

def _clear_authed() -> None:
    st.session_state[SESSION_KEYS["is_authed"]] = False
    st.session_state[SESSION_KEYS["access_token"]] = ""
    st.session_state[SESSION_KEYS["user_email"]] = ""

# 초기값
if SESSION_KEYS["is_authed"] not in st.session_state:
    _clear_authed()

# -----------------------------
# UI
# -----------------------------
st.title("🔐 로그인")
st.caption("KFIT Portal 계정으로 로그인합니다.")

# 이미 로그인 상태면 안내
if st.session_state[SESSION_KEYS["is_authed"]]:
    st.success(f"이미 로그인 상태입니다: {st.session_state[SESSION_KEYS['user_email']]}")
    if st.button("로그아웃"):
        _clear_authed()
        st.rerun()
    st.stop()

with st.form("login_form", clear_on_submit=False):
    email = st.text_input("이메일", placeholder="name@example.com")
    password = st.text_input("비밀번호", type="password", placeholder="••••••••")
    submitted = st.form_submit_button("로그인")

if submitted:
    # 최소 검증 (UI 레벨)
    if not email or not password:
        st.error("이메일과 비밀번호를 입력하세요.")
        st.stop()

    # API 호출 (실서비스에서는 HTTPS + CSRF/RateLimit 등 추가 권장)
    try:
        res = requests.post(
            f"{API_BASE_URL}/auth/login",
            data={"username": email, "password": password},
            timeout=10,
        )

        if res.status_code in (200, 201):
            data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
            token = data.get("access_token") or data.get("token") or ""
            if not token:
                st.error("로그인은 성공했지만 토큰이 비어있습니다. API 응답 포맷을 확인하세요.")
                st.stop()

            _set_authed(email=email, token=token)
            st.success("로그인 성공!")
            st.rerun()

        elif res.status_code in (400, 401, 403):
            st.error("로그인 실패: 이메일/비밀번호를 확인하세요.")
        else:
            st.error(f"로그인 실패: 서버 오류({res.status_code})")
            st.code(res.text)

    except requests.RequestException as e:
        st.error("API 서버에 연결할 수 없습니다.")
        st.code(str(e))

st.markdown("---")
st.caption("회원가입은 메뉴의 회원가입 페이지에서 진행하세요(또는 /register 경로를 연결).")
