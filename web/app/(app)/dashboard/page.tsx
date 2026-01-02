"use client";

// web/app/(app)/dashboard/page.tsx
// ============================================================
// Dashboard (App 그룹)
// - 목적: 기능 접근성(업무 시작점) 극대화 + 향후 확장 용이
// - 원칙:
//   1) 인증/구독 로직은 건드리지 않는다(미들웨어 + /api/me 단일 진실 유지)
//   2) Hero 페이지와 동일한 TopNav UI를 사용한다(일관성)
//   3) 배경은 같은 이미지 + 매우 흐리게(블러/투명) 처리하여 가독성 확보
//
// - 2026-01-02 UI 개선(대표님 요구사항 반영):
//   A) TopNav에 Home 추가(클릭 시 "/")
//   B) 상단 상태표시는 "Plan: free"만 노출 (email/role/구독필요 문구 삭제)
//   C) 배경이 너무 어둡지 않도록 Overlay를 밝게 조정(재방문 유도 톤)
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthNav from "@/app/components/AuthNav";

type Me = {
  id: number;
  email: string;
  name: string;
  created_at: string;
  role?: string;
  plan?: string | null;
  is_subscriber?: boolean | null;
};

type MeResponse =
  | { authenticated: true; me: Me }
  | { authenticated: false; reason?: string };

function isWrappedMe(x: any): x is { authenticated: true; me: Me } {
  return x && typeof x === "object" && x.authenticated === true && x.me;
}

function isPlainMe(x: any): x is Me {
  return x && typeof x === "object" && typeof x.email === "string";
}

export default function DashboardPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 운영 안정화: 중복 호출/언마운트 setState 방지
  const inflightRef = useRef(false);
  const mountedRef = useRef(false);

  async function refreshMe() {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) {
        if (mountedRef.current) setData({ authenticated: false, reason: `http_${res.status}` });
        return;
      }
      const json = await res.json();

      if (isWrappedMe(json)) {
        if (mountedRef.current) setData(json);
        return;
      }
      if (isPlainMe(json)) {
        if (mountedRef.current) setData({ authenticated: true, me: json });
        return;
      }

      if (mountedRef.current) setData({ authenticated: false, reason: "invalid_shape" });
    } catch {
      if (mountedRef.current) setData({ authenticated: false, reason: "client_error" });
    } finally {
      inflightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    refreshMe();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const me = data && data.authenticated ? data.me : null;
  const planLabel = me?.plan || "free";

  return (
    <main style={pageWrap}>
      {/* BLUR BACKGROUND (Hero와 동일 이미지, 매우 흐리게) */}
      <div style={bgWrap} aria-hidden="true">
        <div style={bgImage} />
        <div style={bgOverlay} />
      </div>

      {/* TOP NAV (Hero와 동일 UI) */}
      <header style={topNav}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={logoMark}>KFIT</div>
          <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>한국금융투자기술</span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* ✅ 요청: Home 추가 */}
          <Link href="/" style={navLink}>
            Home
          </Link>

          {/* ✅ 전역 네비(로그인/구독/관리자 토글 등)는 AuthNav가 단일 진실 */}
          <AuthNav />
        </nav>
      </header>

      {/* CONTENT */}
      <section style={contentWrap}>
        <div style={headlineRow}>
          <div>
            <h1 style={h1}>대시보드</h1>
            <p style={sub}>필요한 기능을 한 화면에서 바로 실행할 수 있어요.</p>
          </div>

          {/* ✅ 요청: email(role), 구독필요 등 삭제 → Plan만 표시 */}
          <div style={badgeWrap}>
            {loading ? (
              <span style={badgeMuted}>상태 확인 중…</span>
            ) : (
              <span style={badgeStrong}>
                Plan: <b style={{ fontWeight: 900 }}>{planLabel}</b>
              </span>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={grid}>
          <Card title="비즈니스 툴" desc="Service 내 업무 도구를 빠르게 실행" cta="Service로 이동" href="/service" />

          <Card
            title="구독 신청"
            desc="월 구독으로 다운로드/기능을 잠금 해제"
            cta="구독하러 가기"
            href="/service#subscribe"
          />

          <Card title="제품 다운로드" desc="구독자 전용 다운로드 페이지" cta="Download" href="/download" />

          <Card title="공지사항" desc="업데이트/점검/변경사항 확인" cta="공지 보기" href="/service#notice" />

          <Card title="Q & A" desc="자주 묻는 질문과 해결 가이드" cta="질문 보기" href="/service#qa" />
        </div>

        {/* SECONDARY SECTION: 앞으로 확장 여지 */}
        <div style={panel}>
          <h2 style={h2}>다음 확장 포인트</h2>
          <ul style={ul}>
            <li>Service 내부 “업무툴 런처”를 검색/최근사용/즐겨찾기로 확장</li>
            <li>공지/Q&amp;A는 탭 UI 또는 별도 라우트로 분리 가능</li>
            <li>다운로드 접근제어는 미들웨어가 담당, UI는 안내/유도에 집중</li>
          </ul>
        </div>

        {/* ✅ Footer는 추후 공통 컴포넌트로 분리 예정 (Hero와 통일) */}
        <div style={footer}>
          Copyright © 2025 Korea Financial Investment Technology(KFIT). All rights reserved.
        </div>
      </section>
    </main>
  );
}

function Card({
  title,
  desc,
  cta,
  href,
}: {
  title: string;
  desc: string;
  cta: string;
  href: string;
}) {
  return (
    <div style={card}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={cardTitle}>{title}</div>
        <div style={cardDesc}>{desc}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={chip}>Ready</span>
        <Link href={href} style={cardBtn} >
          {cta}
        </Link>
      </div>
    </div>
  );
}

/* =========================
   Styles (Hero 톤 유지 + 과암흑 개선)
========================= */

const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#05070c",
  color: "white",
  position: "relative",
  overflow: "hidden",
};

const bgWrap: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
};

const bgImage: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    'url("https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=2200&q=80")',
  backgroundSize: "cover",
  backgroundPosition: "center",
  filter: "blur(18px)",
  transform: "scale(1.06)",
  opacity: 0.32, // ✅ 배경은 은은하게 더 살아있게
};

const bgOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  // ✅ 너무 어두운 느낌 제거: 상단은 가볍게, 하단만 살짝 눌러서 텍스트 가독성 확보
  background:
    "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.38) 52%, rgba(0,0,0,0.58) 100%)",
};

const topNav: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  margin: "18px 24px 0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(0,0,0,0.22)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(10px)",
};

const navLink: React.CSSProperties = {
  color: "rgba(255,255,255,0.92)",
  textDecoration: "none",
  fontSize: 14,
  letterSpacing: 0.2,
};

const logoMark: React.CSSProperties = {
  width: 45,
  height: 45,
  borderRadius: 12,
  background: "rgba(255,255,255,0.12)",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(255,255,255,0.18)",
  fontWeight: 800,
  letterSpacing: 0.6,
};

const contentWrap: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 1100,
  margin: "18px auto 0",
  padding: "0 24px 40px",
};

const headlineRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  padding: "18px 0 10px",
};

const h1: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  fontWeight: 900,
  letterSpacing: -0.6,
  textShadow: "0 10px 30px rgba(0,0,0,0.28)",
};

const sub: React.CSSProperties = {
  margin: "8px 0 0",
  opacity: 0.88,
  lineHeight: 1.45,
  maxWidth: 740,
};

const badgeWrap: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const badgeBase: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.20)",
  backdropFilter: "blur(10px)",
  fontSize: 12,
};

const badgeStrong: React.CSSProperties = {
  ...badgeBase,
  fontWeight: 800,
  color: "rgba(255,255,255,0.95)",
};

const badgeMuted: React.CSSProperties = {
  ...badgeBase,
  color: "rgba(255,255,255,0.80)",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
  marginTop: 12,
};

const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.22)",
  backdropFilter: "blur(10px)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: 132,
};

const cardTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  letterSpacing: -0.2,
};

const cardDesc: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.86,
  lineHeight: 1.5,
};

const chip: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  opacity: 0.9,
};

const cardBtn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "rgba(255,255,255,0.92)",
  textDecoration: "none",
};

const panel: React.CSSProperties = {
  marginTop: 16,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  backdropFilter: "blur(10px)",
  padding: 16,
};

const h2: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 900,
  letterSpacing: -0.2,
};

const ul: React.CSSProperties = {
  margin: "10px 0 0",
  paddingLeft: 18,
  opacity: 0.9,
  lineHeight: 1.6,
  fontSize: 13,
};

const footer: React.CSSProperties = {
  marginTop: 18,
  textAlign: "center",
  opacity: 0.65,
  fontSize: 12,
  paddingBottom: 10,
};

/*
[수정 전/후 줄수]
- 전: 약 370줄
- 후: 약 365줄 내외 (배지/상단 링크 정리 + 톤 조정)

[체크리스트]
- ✅ Home 링크 추가 ("/")
- ✅ 상단 배지: Plan만 표시 (email/role/구독필요 삭제)
- ✅ 배경 과암흑 개선(overlay/opacity 조정)
- ✅ Hero 톤(유리질감/블러/라운드) 유지
- ✅ 인증/세션/미들웨어 로직 변경 없음
*/
