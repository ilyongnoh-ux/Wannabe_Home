cd /srv/kfit/portal && cat > pages/99_로그인.py <<'PY'
import streamlit as st
import requests

# 공통: API 베이스 URL (utils.py에 추가해둔 상수 사용)
try:
    from utils import API_BASE
except Exception:
    API_BASE = "https://api.kfit.kr"

st.set_page_config(page_title="로그인 - KFIT", page_icon="🔐", layout="centered")

st.title("🔐 로그인")
st.caption("KFIT 계정으로 로그인합니다.")

# 세션 키 표준화(다른 페이지에서도 재사용)
TOKEN_KEY = "auth_token"

with st.form("login_form", clear_on_submit=False):
    email = st.text_input("이메일", placeholder="example@kfit.kr")
    password = st.text_input("비밀번호", type="password", placeholder="8자 이상")
    submitted = st.form_submit_button("로그인")

if submitted:
    if not email.strip() or not password:
        st.error("이메일/비밀번호를 입력해 주세요.")
    else:
        try:
            r = requests.post(
                f"{API_BASE}/auth/login",
                json={"email": email.strip(), "password": password},
                timeout=10,
            )
            if r.status_code != 200:
                # FastAPI 에러 메시지 그대로 노출(디버깅/운영 편의)
                st.error(f"로그인 실패: {r.text}")
            else:
                data = r.json()
                st.session_state[TOKEN_KEY] = data.get("access_token")
                st.success("로그인 성공! 이제 다른 메뉴로 이동하세요.")
        except Exception as e:
            st.error(f"요청 오류: {e}")

st.divider()

if st.session_state.get(TOKEN_KEY):
    st.info("현재 로그인 상태입니다.")
    if st.button("로그아웃"):
        st.session_state.pop(TOKEN_KEY, None)
        st.success("로그아웃 완료")
        st.rerun()
else:
    st.warning("현재 로그아웃 상태입니다.")
PY
