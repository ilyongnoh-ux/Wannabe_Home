import streamlit as st
from utils import show_footer, hide_header

st.set_page_config(page_title="Company - Kfit", page_icon="🏢", layout="wide")

hide_header()

# 사이드바 강제 숨김
st.markdown(
    """
    <style>
    [data-testid="stSidebar"] {
        display: none;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# 전역 스타일 (네비게이션, 배경, 카드, 미션 영역)
st.markdown(
    """
    <style>
    /* ✅ 전체 배경을 항상 흰색으로 고정 (다크모드에서도) */
    .stApp {
        background-color: #ffffff !important;
        background-image: none !important;
        color: #111827 !important;
    }

    /* 기본 텍스트 색을 어두운 색으로 강제 (다크모드 대비) */
    html, body, [data-testid="stMarkdownContainer"] {
        color: #111827 !important;
    }

    /* 네비게이션 링크 컨테이너 기본 스타일 */
    [data-testid="stPageLink-NavLink"] {
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0px !important; /* 패딩 제거 */
        margin: 0 !important;
        width: auto !important;
    }
    [data-testid="stPageLink-NavLink"] p {
        color: #555555 !important;
        font-size: 1.3rem !important;
        font-weight: 600 !important;
        margin: 0 !important;
        padding: 5px 0px !important; /* 수평 패딩 제거 */
        line-height: 1.0; 
        white-space: nowrap;
    }
    [data-testid="stPageLink-NavLink"]:hover p {
        color: #1E3A8A !important;
        font-weight: 900 !important;
        transform: scale(1.05);
        transition: all 0.2s ease-in-out;
    }

    /* 구분선(|) 스타일 */
    .nav-separator {
        color: #555555; /* 텍스트 색상과 통일 */
        font-size: 1.3rem;
        font-weight: 300; 
        text-align: center;
        margin-top: 0px; 
        opacity: 1.0;
        line-height: 1.0;
    }

    /* [핵심] 네비게이션 강제 밀착 (Magnetic Layout) */
    
    /* 1번 컬럼 (Company): 오른쪽 정렬 + 오른쪽으로 25px 더 밈 */
    div[data-testid="column"]:nth-of-type(1) [data-testid="stPageLink-NavLink"] {
        justify-content: flex-end !important;
        text-align: right !important;
        margin-right: -25px !important; /* 강제 밀착 */
    }

    /* 2번 컬럼 (|): 중앙 정렬 + 공간 최소화 */
    div[data-testid="column"]:nth-of-type(2) {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 !important;
        min-width: 0px !important;
        max-width: 20px !important;
    }

    /* 3번 컬럼 (Service): 왼쪽 정렬 + 왼쪽으로 25px 더 당김 */
    div[data-testid="column"]:nth-of-type(3) [data-testid="stPageLink-NavLink"] {
        justify-content: flex-start !important;
        text-align: left !important;
        margin-left: -25px !important; /* 강제 밀착 */
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# 상단 네비게이션 (좌측 정렬 + 초밀착)
# 비율을 [0.7, 0.15, 0.7, 10] 로 조정하고 gap="small" 옵션을 추가
col_nav1, col_sep, col_nav2, col_empty = st.columns([0.7, 0.15, 0.7, 10], gap="small") 

with col_nav1:
    # "Home"을 "Company"로 변경하고 Home.py로 링크 유지
    st.page_link("Home.py", label="Home", use_container_width=True) 

with col_sep:
    st.markdown('<div class="nav-separator">|</div>', unsafe_allow_html=True)

with col_nav2:
    st.page_link("pages/Service.py", label="Service", use_container_width=True)

#st.divider()

# 페이지 타이틀
st.markdown(
    '<div style="text-align: center; font-size: 2rem; font-weight: 700; '
    'color: #1E3A8A; margin-bottom: 0.5rem;">Company Introduction</div>',
    unsafe_allow_html=True,
)
st.markdown("---")

c1, c2 = st.columns([1, 1])

with c1:
    # 내부 3컬럼으로 가운데 정렬
    left, center, right = st.columns([1, 1, 2])
    with right:
        st.image(
            "pages/ceo.jpg",  # 대표 사진 파일 경로
            caption=None,
            width=220,
        )
        # ✅ 이름 + 회사명을 하나의 블록으로 묶어서 정중앙 배치
        st.markdown(
            """
            <div style="text-align: left; margin-top: 0.5rem;">
                <div class="ceo-name">노일용 대표</div>
                <div class="ceo-title">한국금융투자기술</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

with c2:
    st.markdown("### CEO Message")
    st.markdown(
        """
> "금융은 어렵지 않아야 합니다. 기술은 사람을 향해야 합니다."

안녕하세요,  
**한국금융투자기술 대표 노일용**입니다.

한국금융투자기술은 **보험·연금·투자·세무를 한 번에 바라보는 통합 재무 설계 파트너**입니다.

기아자동차 총무, IT 프로그래머,  
그리고 20년이 넘는 보험·재무 설계 경험을 바탕으로  
**숫자와 계약서를 고객의 언어로 해석하는 일**을 하고 있습니다.

저와 한국금융투자기술이 집중하는 일은 세 가지입니다.  

1. **은퇴·연금 전략** 국민연금·퇴직연금·개인연금을 한 번에 설계해  
   은퇴 이후의 **월 현금 흐름**을 구체적으로 만들어 갑니다.

2. **위험 관리 & 보험 리모델링** 과보장은 줄이고, 꼭 필요한 보장은 채워  
   **가계 지출과 보장 구조를 동시에 정리**합니다.

3. **기업·대표 재무 컨설팅** 소득·세금·건보료·법인 자금을 함께 바라보며  
   대표와 기업 모두에게 유리한 **입체적인 재무 구조**를 설계합니다.

한 번의 계약으로 끝나는 관계가 아니라,  
<b>오래 맡길 수 있는 ‘나만의 금융 담당자’</b>가 되는 것을 목표로 합니다. 
        """,
        unsafe_allow_html=True,
    )

st.markdown("</div>", unsafe_allow_html=True)  # ceo-card 닫기

# =======================
# Mission 영역 (하단 중앙 크게)
# =======================
st.markdown(
    """
    <div class="mission-wrap">
        <div class="mission-label">MISSION</div>
        <div class="mission-text">
            Bridge the Gap between possibility and reality
        </div>
        <div class="mission-sub">
            가능성과 현실의 간극을 메우는, 당신의 평생 금융파트너
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

show_footer()