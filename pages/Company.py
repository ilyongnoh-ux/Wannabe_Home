import streamlit as st
from utils import show_footer, hide_header

st.set_page_config(page_title="Company - Kfit", page_icon="🏢", layout="wide")

hide_header()
# 사이드바 강제 숨김
st.markdown("""<style>[data-testid="stSidebar"] {display: none;}</style>""", unsafe_allow_html=True)

# 네비게이션 스타일 (진한 글씨)
st.markdown("""
    <style>
    [data-testid="stPageLink-NavLink"] {
        background-color: transparent !important; border: none !important; box-shadow: none !important; padding: 0px 10px !important; margin: 0 !important;
    }
    [data-testid="stPageLink-NavLink"] p {
        color: #555555 !important; font-size: 1.3rem !important; font-weight: 600 !important; margin: 0 !important; padding: 5px 10px !important;
    }
    [data-testid="stPageLink-NavLink"]:hover p {
        color: #1E3A8A !important; font-weight: 900 !important; transform: scale(1.05); transition: all 0.2s ease-in-out;
    }
    </style>
""", unsafe_allow_html=True)

col_nav1, col_nav2, col_empty = st.columns([0.2, 0.2, 0.6])
with col_nav1: st.page_link("Home.py", label="Home", use_container_width=True)
with col_nav2: st.page_link("pages/Service.py", label="Service", use_container_width=True)

st.divider()

st.markdown('<div style="text-align: center; font-size: 3rem; font-weight: 700; color: #1E3A8A; margin-bottom: 0.5rem;">Company Introduction</div>', unsafe_allow_html=True)
st.markdown("---")

c1, c2 = st.columns([1, 2])
with c1: st.image("https://via.placeholder.com/400x400?text=CEO+Photo", caption="CEO 노일용")
with c2:
    st.subheader("👨‍💼 CEO Message")
    st.write("""
    > **"금융은 어렵지 않아야 합니다. 기술은 사람을 향해야 합니다."**
    
    안녕하세요, **한국금융투자기술 대표 노일용**입니다.
    기아자동차 총무팀, 로커스 프로그래머, 그리고 23년차 보험 전문가로서의 경험을 바탕으로
    고객 여러분께 가장 객관적이고 과학적인 금융 솔루션을 제공하겠습니다.
    """)
    st.divider()
    st.info("💡 **Mission:** 데이터 기반의 객관적 금융 진단으로 고객의 경제적 자유를 실현합니다.")

show_footer()