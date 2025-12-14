import streamlit as st
import base64
import time

# 1. 페이지 설정 (최대한 빨리 로드되도록 맨 위에 배치)
st.set_page_config(
    page_title="연결 중...",
    page_icon="🔗",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- 💡 이미지 자동 로드 함수 ---
def get_base64_of_bin_file(bin_file):
    try:
        with open(bin_file, 'rb') as f:
            data = f.read()
        return base64.b64encode(data).decode()
    except FileNotFoundError:
        return None

# 이미지 파일 로드
image_filename = 'ci.png' 
base64_image = get_base64_of_bin_file(image_filename)

# 이미지가 없을 경우를 대비한 배경색 설정
bg_css_line = f'background-image: url("data:image/png;base64,{base64_image}");' if base64_image else 'background-color: white;'

# 2. HTML/CSS/JS 코드 (강력한 덮어쓰기 적용)
html_code = f"""
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA_MEASUREMENT_ID');
</script>

<script>
    // 5초 후 리디렉션
    setTimeout(function() {{
        window.location.href = 'https://kfit.kr'; 
    }}, 5000); 
</script>

<style>
    /* [핵심 1] Streamlit의 기본 헤더와 사이드바, 푸터 강제 숨김 */
    header[data-testid="stHeader"] {{
        display: none !important;
    }}
    div[data-testid="stSidebar"] {{
        display: none !important;
    }}
    footer {{
        display: none !important;
    }}

    /* [핵심 2] 로딩 화면을 전체 화면 덮어쓰기(Overlay)로 설정 */
    .loading-overlay {{
        position: fixed;        /* 화면에 고정 */
        top: 0;
        left: 0;
        width: 100vw;           /* 너비 100% */
        height: 100vh;          /* 높이 100% */
        z-index: 999999;        /* [중요] 모든 요소보다 맨 위에 배치 */
        
        /* 배경 설정 */
        {bg_css_line}
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center center;
        
        /* 내용 정렬 */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }}

    /* 텍스트 박스 스타일 */
    .loading-text {{
        font-family: 'Pretendard', sans-serif; /* 폰트가 없다면 기본 sans-serif */
        font-size: 1.5em;
        font-weight: 800;
        text-align: center;
        margin: 0;
        padding: 40px 60px;
        
        background-color: rgba(255, 255, 255, 0.95); 
        border-radius: 20px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        color: #333;
        line-height: 1.6;
    }}

    /* 다크 모드 대응 */
    @media (prefers-color-scheme: dark) {{
        .loading-overlay {{
            background-image: none !important; /* 다크모드에선 배경 이미지 제거 원하시면 유지 */
            background-color: #111 !important;
        }}
        .loading-text {{
            background-color: rgba(30, 30, 30, 0.9);
            color: white;
            box-shadow: 0 10px 25px rgba(255,255,255,0.1);
        }}
    }}
</style>

<div class="loading-overlay">
    <div class="loading-text">
        한국금융투자기술<br>
        서비스 페이지로 이동 중입니다...
    </div>
</div>
"""

# 3. 실행
st.markdown(html_code, unsafe_allow_html=True)