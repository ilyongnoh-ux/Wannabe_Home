import streamlit as st

# 1. 페이지 설정 (파비콘과 제목은 Streamlit 방식으로 설정)
st.set_page_config(
    page_title="연결 중...",
    page_icon="🔗",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# 2. HTML 및 CSS 코드를 Markdown으로 삽입
html_code = """
<html>
    <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_MEASUREMENT_ID"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'YOUR_GA_MEASUREMENT_ID');
        </script>
        <script>
            setTimeout(function() {
                window.location.href = 'https://kfit.kr'; // 5000ms (5초) 후 리디렉션
            }, 5000); 
        </script>
        
        <style>
            /* 1. Streamlit 앱 전체를 화면 중앙에 배치하기 위한 CSS */
            .stApp {
                display: flex;
                flex-direction: column;
                justify-content: center; /* 수직 중앙 정렬 */
                align-items: center;     /* 수평 중앙 정렬 */
                height: 100vh; /* 전체 화면 높이 사용 */
                margin: 0;
            }

            /* 2. body 기본 스타일 (Streamlit 컨테이너 내에서 작동) */
            body {
                background-color: white; 
                color: black;          
                font-family: sans-serif;
                font-size: 1.2em;
            }
            
            /* 3. 텍스트 스타일 */
            p {
                font-weight: 600;
                text-align: center;
                /* 텍스트가 중앙에 오도록 추가 마진 제거 */
                margin: 0;
                padding: 20px;
            }

            /* 사용자 시스템이 다크 모드일 때 (prefers-color-scheme: dark) */
            @media (prefers-color-scheme: dark) {
                .stApp, body {
                    background-color: black !important; /* 검정색 배경 강제 */
                    color: white !important;           /* 흰색 글씨 강제 */
                }
                p {
                    color: white !important; 
                }
            }
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