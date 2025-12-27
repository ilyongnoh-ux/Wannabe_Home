import streamlit as st
from utils import show_footer, hide_header, set_global_page_config
from apps import Wannabe_Golf, Wannabe_Tax, Wannabe_Life_Plan

set_global_page_config()

hide_header()

# [CSS] 사이드바 숨김 & 스타일링 & [NEW] 가로 스크롤 방지
st.markdown("""
    <style>
    [data-testid="stSidebar"] { display: none; }
    [data-testid="stSidebarCollapsedControl"] { display: none; }

    /* [핵심 수정] 모바일 가로 스크롤(좌우 흔들림) 방지 */
    html, body, [data-testid="stAppViewContainer"] {
        overflow-x: hidden !important; /* 가로 넘침 숨김 */
        max-width: 100vw !important;   /* 화면 폭을 뷰포트 너비로 제한 */
        touch-action: pan-y !important; /* 터치 동작을 수직 스크롤로만 제한 (일부 브라우저 지원) */
    }
    
    /* 컨텐츠 컨테이너도 가로 폭 제한 */
    .block-container {
        max-width: 100% !important;
        overflow-x: hidden !important;
        padding-left: 1rem !important; /* 모바일에서 너무 딱 붙지 않게 여백 조정 */
        padding-right: 1rem !important;
    }

    [data-testid="stPageLink-NavLink"] { 
        border: none !important; 
        background: transparent !important; 
        padding: 0px !important; /* 전체 패딩 제거 */
        margin: 0 !important; /* 마진 제거 */
        width: auto !important;
    }

    /* 기본 상태 */
    [data-testid="stPageLink-NavLink"] p { 
        font-size: 1.2rem;            
        font-weight: 600; 
        color: var(--text-color); 
        padding: 5px 0px !important; /* 상하 패딩 유지, 좌우 패딩 제거 */
        margin: 0; 
        transition: all 0.15s ease-in-out; 
        line-height: 1.0; 
        white-space: nowrap; /* 글자 줄바꿈 방지 */
    }

    /* 호버 상태 */
    [data-testid="stPageLink-NavLink"]:hover p { 
        color: var(--primary-color) !important; 
        font-weight: 900 !important; 
        transform: scale(1.05);            
    }
    
    /* 3. 구분선(|) 스타일 재추가 */
    .nav-separator {
        color: var(--text-color); /* Streamlit 기본 텍스트 색상 사용 */
        font-size: 1.2rem;
        font-weight: 300; 
        text-align: center;
        margin-top: 0px; /* 높이 미세 조정 */
        opacity: 1.0;
        line-height: 1.0;
        width: 10px; 
        margin-left: auto;
        margin-right: auto;
    }

    /* [핵심 재추가] 네비게이션 강제 밀착 (Magnetic Layout - Full Width) */
    
    /* 1번 컬럼 (Home): 오른쪽 정렬 + 오른쪽으로 15px 더 밈 (글자 잘림 방지 위한 안전 마진) */
    div[data-testid="column"]:nth-of-type(1) [data-testid="stPageLink-NavLink"] {
        justify-content: flex-end !important;
        text-align: right !important;
        margin-right: -25px !important; 
    }

    /* 2번 컬럼 (|): 중앙 정렬 + 공간 최소화 */
    div[data-testid="column"]:nth-of-type(2) {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 !important;
        min-width: 0px !important;
        max-width: 0px !important;
    }

    /* 3번 컬럼 (Company): 왼쪽 정렬 + 왼쪽으로 15px 더 당김 (글자 잘림 방지 위한 안전 마진) */
    div[data-testid="column"]:nth-of-type(3) [data-testid="stPageLink-NavLink"] {
        justify-content: flex-start !important;
        text-align: left !important;
        margin-left: -25px !important; 
    }

    /* 상단 여백 조정 */
    .block-container { padding-top: 1rem !important; }
    </style>
""", unsafe_allow_html=True)

# ==============================================================================
# [수정 시작] 네비게이션을 페이지 최상단으로 이동 (Home | Company)
# ==============================================================================
# 구조: [Home] [|] [Company] [나머지 여백]
col_nav1, col_sep, col_nav2, _ = st.columns([0.7, 0.15, 0.7, 10], gap="small") 

with col_nav1: 
    st.page_link("Home.py", label="Home", use_container_width=True)

with col_sep:
    st.markdown('<div class="nav-separator">|</div>', unsafe_allow_html=True)

with col_nav2: 
    st.page_link("pages/Company.py", label="Company", use_container_width=True)

# [수정 끝]


# ==============================================================================
# URL 꼬리표(Query Params) 감지 로직
# ==============================================================================
query_params = st.query_params
target_tool = query_params.get("tool", "life") 

tool_options = ["Wannabe Life Plan", "Wannabe Tax", "Wannabe Golf"]
tool_map = {
    "life": 0,  
    "tax": 1,   
    "golf": 2   
}

default_idx = tool_map.get(str(target_tool).lower(), 0)

# ==============================================================================
# 화면 분할 및 실행
# ==============================================================================
left_col, right_col = st.columns([3, 7], gap="medium")

with left_col:
    st.write("") 
    
    # [제거] 기존 좌측 프레임 메뉴 코드를 삭제
    # c1, c2 = st.columns(2)
    # with c1: st.page_link("Home.py", label="Home", use_container_width=True)
    # with c2: st.page_link("pages/Company.py", label="Company", use_container_width=True)
    
    # st.markdown("<hr style='margin: 10px 0; border: 0; border-top: 1px solid #ddd;'>", unsafe_allow_html=True) // 상단에 이미 구분선 추가됨
    
    st.markdown("<h3 style='margin: 0 0 10px 0; font-size: 1.8rem;'>Solution Menu</h3>", unsafe_allow_html=True)
    
    selected_app = st.selectbox(
        "솔루션 선택", 
        tool_options, 
        index=default_idx, 
        label_visibility="collapsed"
    )
    st.markdown("---")

with right_col:
    if selected_app == "Wannabe Golf":
        Wannabe_Golf.app(left_col)
    elif selected_app == "Wannabe Tax":
        Wannabe_Tax.app(left_col)
    elif selected_app == "Wannabe Life Plan":
        Wannabe_Life_Plan.app(left_col)


show_footer()