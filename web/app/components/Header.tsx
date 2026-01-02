"use client";

// web/app/components/Header.tsx
// ============================================================
// KFIT Portal - Header (UI 컨테이너 유지, 네비 로직 단일화)
//  - 목적:
//    * "메뉴 규칙의 단일 진실"을 AuthNav로 통합한다.
//    * Header에서 /api/me 호출 및 자체 메뉴 렌더를 제거해
//      '중복 네비게이션(Company/Service/Download + Company | 로그인)' 문제를 원천 차단한다.
//
//  - CTO 원칙:
//    * 인증/세션/미들웨어 로직은 건드리지 않는다.
//    * Header는 레이아웃(프레임)만 담당하고,
//      메뉴 구성/토글은 AuthNav가 전담한다.
// ============================================================

import Link from "next/link";
import AuthNav from "./AuthNav";

export default function Header() {
  return (
    <header
      style={{
        height: 64,
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      {/* 좌측 로고(기존 UI 유지) */}
      <Link href="/" style={{ fontWeight: 800, fontSize: 18, textDecoration: "none", color: "inherit" }}>
        KFIT
      </Link>

      {/* 우측 메뉴: AuthNav 단일 렌더(중복 메뉴 방지) */}
      <nav style={{ display: "flex", alignItems: "center" }}>
        <AuthNav />
      </nav>
    </header>
  );
}

/*
[변경 요약]
- ✅ Header에서 /api/me 호출 제거 (중복 네비/상태 불일치 원인 제거)
- ✅ Header 우측 메뉴를 AuthNav 단일 렌더로 통합
- ✅ UI 프레임(높이/보더/정렬/패딩/로고)은 유지

[수정 전/후 줄수]
- 전: 약 79줄
- 후: 약 52줄

[체크리스트]
- ✅ UI 유지됨 (Header 레이아웃/로고 유지)
- ✅ 중복 네비게이션 제거됨 (AuthNav가 메뉴 규칙 단일 진실)
- ✅ 인증/세션 로직 변경 없음
*/
