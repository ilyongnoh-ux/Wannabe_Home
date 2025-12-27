import streamlit as st
import requests

API = "http://localhost:8000"

st.title("KFITER MVP Portal")

if st.button("다운로드 토큰 발급"):
    res = requests.post(f"{API}/download/sign")
    token = res.json()["token"]
    url = f"https://dl.kfit.kr/download/kfiter-setup.exe?token={token}"
    st.write("다운로드 링크:")
    st.code(url)
