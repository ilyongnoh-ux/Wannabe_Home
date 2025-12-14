import streamlit as st

# 1. 페이지 설정 (파비콘과 제목은 Streamlit 방식으로 설정)
st.set_page_config(
    page_title="연결 중...",
    page_icon="🔗",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# 2. HTML 및 CSS 코드를 Markdown으로 삽입
# 리디렉션 메타 태그와 다크 모드 감지 CSS를 포함합니다.
html_code = """
<html>
    <head>
        <meta http-equiv="refresh" content="5;url=https://kfit.kr">
        
        <style>
            /* 기본 설정 (라이트 모드 또는 설정 없음) */
            body {
                background-color: white; /* 흰색 배경 */
                color: black;          /* 검정색 글씨 */
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh; /* 전체 화면 높이 사용 */
                margin: 0;
                font-family: sans-serif;
                font-size: 1.2em;
                /* Streamlit의 기본 패딩/마진을 무시하고 전체 페이지를 차지하도록 설정 */
            }
            .stApp {
                background-color: white !important; /* Streamlit 앱 배경도 흰색으로 강제 */
            }

            /* 사용자 시스템이 다크 모드일 때 (prefers-color-scheme: dark) */
            @media (prefers-color-scheme: dark) {
                body {
                    background-color: black; /* 검정색 배경 */
                    color: white;          /* 흰색 글씨 */
                }
                .stApp {
                    background-color: black !important; /* Streamlit 앱 배경도 검정색으로 강제 */
                }
            }
        </style>
    </head>
    <body>
        <p>한국금융투자기술 서비스 페이지로 연결 중입니다...</p>
    </body>
</html>
"""

# Streamlit에 HTML 코드 삽입 (페이지를 완전히 덮어씌웁니다)
st.markdown(html_code, unsafe_allow_html=True)

# Streamlit의 기본 요소가 표시되지 않도록 빈 컨테이너를 하나 더 추가
st.empty()