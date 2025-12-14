import streamlit as st
import base64
import os

# 1. 페이지 설정
st.set_page_config(
    page_title="연결 중...",
    page_icon="🔗",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# --- 💡 이미지 자동 로드 함수 ---
def get_base64_of_bin_file(bin_file):
    """png 파일을 찾아서 Base64로 즉시 변환해주는 함수"""
    try:
        with open(bin_file, 'rb') as f:
            data = f.read()
        return base64.b64encode(data).decode()
    except FileNotFoundError:
        return None

# [중요] 여기에 사용할 이미지 파일명을 정확히 적어주세요.
# 파일이 같은 폴더에 있어야 합니다.
image_filename = 'ci.png' 
base64_image = get_base64_of_bin_file(image_filename)

# 이미지를 못 찾았을 경우 경고 표시 (디버깅용)
if base64_image is None:
    st.error(f"⚠️ '{image_filename}' 파일을 찾을 수 없습니다. 같은 폴더에 이미지가 있는지 확인해주세요!")
    bg_style = "" # 이미지가 없으면 배경 스타일 적용 안 함
else:
    # 이미지가 있으면 CSS 생성
    bg_style = f"""
    .stApp {{
        background-image: url("data:image/png;base64,{base64_image}");
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center center;
        background-attachment: fixed;
    }}
    """

# 2. HTML/CSS/JS 코드
html_code = f"""
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA_MEASUREMENT_ID');
</script>

<script>
    setTimeout(function() {{
        window.location.href = 'https://kfit.kr'; 
    }}, 5000); 
</script>

<style>
/* 1. 배경 이미지 스타일 적용 */
{bg_style}

/* 2. 컨텐츠 정렬 */
.stApp {{
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}}

/* 3. 텍스트 박스 스타일 */
.loading-text {{
    font-family: sans-serif;
    font-size: 1.2em;
    font-weight: 800;
    text-align: center;
    margin: 0;
    padding: 30px 50px;
    background-color: rgba(255, 255, 255, 0.9); 
    border-radius: 15px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    color: black;
    z-index: 999; /* 배경 위에 글씨가 오도록 설정 */
}}

/* 다크 모드에서도 이미지가 보이도록 강제 (배경 숨김 코드 삭제함) */
@media (prefers-color-scheme: dark) {{
    .loading-text {{
        background-color: rgba(30, 30, 30, 0.9);
        color: white;
    }}
}}
</style>

<div class="loading-text">
    한국금융투자기술 서비스 페이지로<br>연결 중입니다...
</div>
"""

# 3. 실행
st.markdown(html_code, unsafe_allow_html=True)
st.empty()