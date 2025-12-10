import streamlit as st
import base64
import requests
import json

# [필수] 구글 앱스 스크립트(GAS) 배포 URL
GAS_URL = "https://script.google.com/macros/s/AKfycbwF9R_qvwl1yhXaXsohYnTOBx1NR0s8tDNfzXL3jy8_WJm96RSiMBxS4tYFQAULSexu/exec"

def send_data_to_api(app_type, data_list):
    '''API 전송 함수'''
    if "여기에" in GAS_URL:
        return False, "utils.py에 GAS_URL을 입력해주세요."
    try:
        payload = {"type": app_type, "payload": data_list}
        response = requests.post(GAS_URL, data=json.dumps(payload), headers={'Content-Type': 'application/json'})
        if response.status_code == 200: return True, "저장 성공"
        else: return False, f"서버 오류: {response.status_code}"
    except Exception as e: return False, f"전송 실패: {str(e)}"

def set_bg_hack(main_bg):
    '''Home 배경 설정'''
    try:
        main_bg_ext = "jpg"
        st.markdown(
             f"""
             <style>
             .stApp {{
                 background: url(data:image/{main_bg_ext};base64,{base64.b64encode(open(main_bg, "rb").read()).decode()});
                 background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: fixed;
             }}
             </style>
             """, unsafe_allow_html=True)
    except: pass

def hide_header():
    '''상단 툴바 숨기기'''
    st.markdown("""<style>[data-testid="stHeader"] {visibility: hidden;} #MainMenu {visibility: hidden;} footer {visibility: hidden;} .block-container {padding-top: 0rem !important;}</style>""", unsafe_allow_html=True)

def hide_sidebar():
    '''사이드바 숨기기'''
    st.markdown("""<style>[data-testid="stSidebar"] {display: none;} [data-testid="stSidebarCollapsedControl"] {display: none;}</style>""", unsafe_allow_html=True)

def show_footer():
    st.markdown(
        """
        <style>
        /* 공통 footer 스타일 */
        .kfit-footer {
            width: 100%;
            text-align: center;
            padding: 10px 8px 18px;
            margin-top: 1.5rem;
            color: #4b5563;
            font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            font-size: 0.95rem;
        }

        /* 각 단락(문장)을 span으로 쪼개서 관리 */
        .kfit-footer-line {
            display: inline-block;
            margin: 0 6px;
            white-space: nowrap;  /* 데스크탑에서는 한 줄 유지 */
        }

        /* 🔽 모바일(좁은 화면)일 때 전용 설정 */
        @media (max-width: 768px) {
            .kfit-footer {
                /* 화면 너비에 따라 자동으로 줄어드는 글씨 크기 */
                font-size: clamp(11px, 3.2vw, 14px);
                line-height: 1.4;
            }

            .kfit-footer-line {
                display: block;        /* 단락마다 한 줄씩 */
                margin: 2px 0;
                white-space: normal;   /* 줄 안에서 자동 줄바꿈 허용 */
            }
        }
        </style>

        <div class="kfit-footer">
            <span class="kfit-footer-line">© 2024 한국금융투자기술</span>
            <span class="kfit-footer-line">Bridge the Gap between possibility and reality</span>
            <span class="kfit-footer-line">Your Lifetime Financial Partner</span>
        </div>
        """,
        unsafe_allow_html=True,
    )

# ==========================================
# [NEW] 공통 상담 신청 폼 컴포넌트
# ==========================================
def render_common_form(app_type, DataModelClass, **simulation_data):
    """
    모든 앱에서 공통으로 사용하는 상담 신청 폼
    :param app_type: "golf", "tax", "life" 등 API 구분값
    :param DataModelClass: models.py에 정의된 데이터 클래스 (GolfData 등)
    :param simulation_data: 각 앱에서 계산된 결과값들 (딕셔너리 형태로 전달)
    """
    st.divider()
    st.markdown("### 📞 Premium 상담 신청")
    st.caption("신청하시면 상세 리포트와 전문가 피드백을 받아보실 수 있습니다.")

    with st.form(f"{app_type}_common_form"):
        # 공통 입력 필드 (2단 배열)
        c1, c2 = st.columns(2)
        name = c1.text_input("성함", placeholder="예: 홍길동")
        phone = c2.text_input("연락처", placeholder="010-0000-0000")
        
        memo = st.text_area("문의사항 (선택)", placeholder="궁금한 점을 남겨주세요.", height=80)
        agree = st.checkbox("개인정보 수집 및 이용에 동의합니다.")
        
        submit_btn = st.form_submit_button("🚀 무료 리포트 받기", use_container_width=True)

        if submit_btn:
            if not name or not phone:
                st.warning("⚠️ 성함과 연락처를 입력해주세요.")
            elif not agree:
                st.warning("⚠️ 개인정보 동의가 필요합니다.")
            else:
                # [핵심] 공통 필드(이름,폰,메모) + 시뮬레이션 결과(simulation_data)를 합쳐서 객체 생성
                try:
                    data_obj = DataModelClass(
                        name=name, 
                        phone=phone, 
                        memo=memo, 
                        **simulation_data
                    )
                    
                    with st.spinner('데이터 전송 중...'):
                        res, msg = send_data_to_api(app_type, data_obj.to_payload())
                    
                    if res:
                        st.balloons()
                        st.success(f"✅ {name}님, 신청이 완료되었습니다!")
                    else:
                        st.error(f"❌ 전송 실패: {msg}")
                except Exception as e:

                    st.error(f"데이터 처리 중 오류 발생: {str(e)}")

