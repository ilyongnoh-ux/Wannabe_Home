import streamlit as st
import base64

# --- 💡 1단계: Base64 인코딩 함수 (실제 파일 경로를 넣어 실행해야 합니다) ---
def encode_image_to_base64(filepath):
    """지정된 파일 경로의 이미지를 Base64 문자열로 인코딩합니다."""
    try:
        with open(filepath, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return f"data:image/png;base64,{encoded_string}"
    except FileNotFoundError:
        return ""

# --- 2단계: 실제 Base64 문자열로 대체 (실제 파일 인코딩 후 사용) ---
CI_BG_IMAGE = "YOUR_CI_PNG_BASE64_STRING" 

# 1. 페이지 설정
st.set_page_config(
    page_title="연결 중...",
    page_icon="🔗",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# 2. HTML 및 CSS 코드를 Markdown으로 삽입
html_code = f"""
<html>
    <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_MEASUREMENT_ID"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){{dataLayer.push(arguments);}}
          gtag('js', new Date());
          gtag('config', 'YOUR_GA_MEASUREMENT_ID');
        </script>
        <script>
            setTimeout(function() {{
                window.location.href = 'https://kfit.kr'; // 5000ms (5초) 후 리디렉션
            }}, 5000); 
        </script>
        
        <style>
            .stApp {{
                background-image: url('{CI_BG_IMAGE}');
                background-size: cover;
                background-repeat: no-repeat;
                background-position: center center;
                background-attachment: fixed;
                
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }}

            body {{
                background-color: transparent; 
                color: black;          
                font-family: sans-serif;
                font-size: 1.2em;
            }}
            
            p {{
                font-weight: 800;
                text-align: center;
                margin: 0;
                padding: 20px;
                background-color: rgba(255, 255, 255, 0.8); 
                border-radius: 5px;
            }}

            @media (prefers-color-scheme: dark) {{
                .stApp {{
                    background-image: none !important;
                    background-color: black !important; 
                }}
                body {{
                    background-color: transparent !important;
                    color: white !important;
                }}
                p {{
                    color: white !important; 
                    background-color: rgba(0, 0, 0, 0.8);
                }}
            }}
        </style>
    </head>
    <body>
        <p>한국금융투자기술 서비스 페이지로 연결 중입니다...</p>
    </body>
</html>
"""

# Streamlit에 HTML 코드 삽입
st.markdown(html_code, unsafe_allow_html=True)

# Streamlit의 기본 요소가 표시되지 않도록 빈 컨테이너를 하나 더 추가
st.empty()