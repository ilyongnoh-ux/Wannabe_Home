import streamlit as st
from utils import set_bg_hack, show_footer, hide_header

st.set_page_config(
    page_title="한국금융투자기술",
    page_icon="💼",
    layout="wide",
    initial_sidebar_state="collapsed",
)

hide_header()
set_bg_hack("background.jpg")

# 사이드바 강제 숨김
st.markdown(
    """
    <style>
    [data-testid="stSidebar"] {display: none;}
    </style>
    """,
    unsafe_allow_html=True,
)

# 네비게이션 스타일
st.markdown(
    """
    <style>
    /* 네비게이션 링크 컨테이너 기본 스타일 */
    [data-testid="stPageLink-NavLink"] {
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0px !important;
        margin: 0 !important;
        text-decoration: none !important;
        width: auto !important; /* 너비 자동 */
    }
    
    /* 텍스트 스타일 */
    [data-testid="stPageLink-NavLink"] p {
        color: #FFFFFF !important;
        font-size: 1.3rem !important;
        font-weight: 700 !important;
        margin: 0 !important;
        padding: 5px 0px !important;
        text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 10px rgba(0,0,0,0.7);
        line-height: 1.0; 
        white-space: nowrap;
    }
    
    /* 호버 효과 */
    [data-testid="stPageLink-NavLink"]:hover p {
        color: #FFD700 !important;
        font-weight: 800 !important;
        transform: scale(1.05);
        text-shadow: 0px 0px 15px rgba(255, 215, 0, 0.8), 0px 2px 5px rgba(0,0,0,1);
        transition: all 0.2s ease-in-out;
    }

    /* 구분선(|) 스타일 */
    .nav-separator {
        color: #FFFFFF;
        font-size: 1.3rem;
        font-weight: 300; 
        text-align: center;
        margin-top: 0px; 
        text-shadow: 0px 2px 4px rgba(0,0,0,0.9);
        opacity: 1.0;
        line-height: 1.0;
    }

    /* [핵심 기술] 네비게이션 초밀착(Magnetic Layout) 
       첫 번째 가로 블록(네비게이션) 내의 컬럼들을 타겟팅하여 안쪽으로 당김 */
    
    /* 1번 컬럼 (Company) -> 오른쪽 정렬 + 오른쪽으로 25px 더 밈 */
    div[data-testid="column"]:nth-of-type(1) [data-testid="stPageLink-NavLink"] {
        justify-content: flex-end !important;
        text-align: right !important;
        margin-left: -25px !important; /* 강제 밀착 */
    }

    /* 2번 컬럼 (|) -> 중앙 정렬 + 좌우 여백 제거 */
    div[data-testid="column"]:nth-of-type(2) {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 !important;
        min-width: 0px !important;
    }

    /* 3번 컬럼 (Service) -> 왼쪽 정렬 + 왼쪽으로 25px 더 당김 */
    div[data-testid="column"]:nth-of-type(3) [data-testid="stPageLink-NavLink"] {
        justify-content: flex-start !important;
        text-align: left !important;
        margin-left: -25px !important; /* 강제 밀착 */
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# 상단 네비게이션 (좌측 정렬 + 비율 조정)
# 비율을 [0.7, 0.1, 0.7, 10] 처럼 상대적 가중치(Weight)로 주어 빈틈을 줄입니다.
col_nav1, col_sep, col_nav2, col_empty = st.columns([0.7, 0.15, 0.7, 10], gap="small") 

with col_nav1:
    st.page_link("pages/Company.py", label="Company", use_container_width=True)

with col_sep:
    st.markdown('<div class="nav-separator">|</div>', unsafe_allow_html=True)

with col_nav2:
    st.page_link("pages/Service.py", label="Service", use_container_width=True)

# 메인 타이틀 영역 (유지)
st.markdown(
    """
<div style="text-align: center; margin-top: 150px; margin-bottom: 30px;">
<h1 style="color: #FFFFFF; font-size: 4.5rem; font-family: 'Arial Black', sans-serif; text-shadow: 0px 4px 3px rgba(0,0,0,0.4), 0px 8px 13px rgba(0,0,0,0.1), 0px 18px 23px rgba(0,0,0,0.1), 0px 0px 30px rgba(0,0,0,0.9); font-weight: 900; margin-bottom: 15px; letter-spacing: -2px;">Bridge the Gap</h1>
<div style="background: linear-gradient(to right, transparent, rgba(0,0,0,0.3), transparent); padding: 20px 0;">
<h3 style="color: #FFFFFF; font-size: 1.6rem; text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 20px rgba(0,0,0,0.8); font-weight: 700; margin-top: 0; margin-bottom: 10px; letter-spacing: -1px; word-break: keep-all;">가능성과 현실의 간극을 메우는,</h3>
<h3 style="color: #FFFFFF; font-size: 2rem; text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 20px rgba(0,0,0,0.8); font-weight: 800; margin-top: 0; word-break: keep-all;">
<span style="display: inline-block;">당신의 평생 금융파트너,</span>
<span style="display: inline-block;">한국금융투자기술(KFIT)®</span>
</h3>
</div>
</div>
    """,
    unsafe_allow_html=True,
)

# 페이지 하단 여유 공간
st.markdown(
    "<div style='height: 40vh;'></div>",
    unsafe_allow_html=True,
)

# 항상 맨 마지막에 호출
show_footer()