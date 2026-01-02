// web/app/company/page.tsx
"use client";

/**
 * ============================================================
 * Company Page (회사 소개 / 랜딩)
 * ------------------------------------------------------------
 * CTO 의도(안전):
 * - 상단 네비게이션에 Company 링크가 항상 존재하므로
 *   404 없이 동선이 이어지게 "최소 골격" 페이지를 먼저 둔다.
 * - 기존 Home/Hero UI 톤(다크 + 카드)과 충돌하지 않도록 단순 구성.
 * - 상세 소개/이미지/CTA는 다음 단계에서 확장.
 * ============================================================
 */

import Link from "next/link";

export default function CompanyPage() {
  const heroStyle: React.CSSProperties = {
    minHeight: "calc(100vh - 120px)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "34px 24px",
    color: "rgba(255,255,255,0.92)",
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 980,
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 18,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 0.2,
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    opacity: 0.86,
    margin: 0,
    lineHeight: 1.7,
    fontSize: 14,
  };

  const listStyle: React.CSSProperties = {
    margin: "12px 0 0 0",
    paddingLeft: 18,
    opacity: 0.86,
    lineHeight: 1.7,
    fontSize: 14,
  };

  const btnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "rgba(255,255,255,0.92)",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
  };

  const ghostBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: "transparent",
  };

  return (
    <div style={heroStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Company</h1>
        <p style={descStyle}>
          한국금융투자기술(KFIT)은 보험·금융 현장의 “시간과 실수”를 줄이는 실무 도구를 만듭니다.
          <br />
          말만 번지르르한 플랫폼이 아니라, <b>현장에서 매일 쓰는 도구</b>로 증명합니다.
        </p>

        <ul style={listStyle}>
          <li>내부 포털: 로그인/권한/대시보드</li>
          <li>로컬 CRM(KFITER): 설계사 업무에 최적화된 로컬 프로그램</li>
          <li>운영 기반: 구독/다운로드/업데이트/감사 로그</li>
        </ul>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <Link href="/service" style={{ ...btnStyle, textDecoration: "none", display: "inline-flex" }}>
            Service
          </Link>
          <Link href="/" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
            홈
          </Link>
          <Link href="/login" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
            로그인
          </Link>
        </div>

        <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, lineHeight: 1.6 }}>
          <div>• 다음 단계: Company 페이지에 브랜드/제품(포털+KFITER)/신뢰 요소(보안/감사) 섹션 확장</div>
          <div>• CTO 원칙: UI보다 먼저 “운영 진실(로그/권한/구독)”을 고정한다</div>
        </div>
      </div>
    </div>
  );
}

/*
[변경 요약]
- ✅ /company 페이지 추가(네비게이션 동선 404 방지)
- ✅ 최소 회사 소개 + CTA(서비스/홈/로그인) 제공
- ✅ 기존 다크/카드 톤과 충돌 없는 단순 UI

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 155줄

[체크리스트]
- ✅ UI 유지/존치: 기존 톤과 충돌 없음
- ✅ 수정 범위: 신규 페이지 추가만
- ✅ 인증/세션/권한 로직 변경 없음
*/
