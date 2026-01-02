"use client";

// web/app/(marketing)/page.tsx
// ============================================================
// HERO / LANDING PAGE (비로그인 영역)
// - URL: /
// - 목적: 브랜드 메시지 + 진입 동선 제공
// - 주의: 인증 / 대시보드 / 구독 로직 ❌ (절대 포함 금지)
// ============================================================

import React from "react";
import Link from "next/link";
import AuthNav from "@/app/components/AuthNav";

export default function MarketingHome() {
  return (
    <main style={pageWrap}>
      {/* BACKGROUND */}
      <div style={bgWrap} aria-hidden="true">
        <div style={bgImage} />
        <div style={bgOverlay} />
      </div>

      {/* TOP NAV */}
      <header style={topNav}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={logoMark}>KFIT</div>
          <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
            한국금융투자기술
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 18 }}>
         <AuthNav />
        </nav>
      </header>

      {/* HERO CONTENT */}
      <section style={heroContent}>
        <h1 style={heroTitle}>Bridge the Gap</h1>
        <p style={heroSub}>
          가능성과 현실의 간극을 메우는,
          <br />
          당신의 평생 사업파트너
        </p>
      </section>

      {/* FOOTER */}
      <footer style={footer}>
        Copyright © 2025 Korea Financial Investment Technology(KFIT).
        All rights reserved.
      </footer>
    </main>
  );
}

/* =========================
   Styles
========================= */

const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  color: "white",
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
};

const bgOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.85) 100%)",
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
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(10px)",
};

const navLink: React.CSSProperties = {
  color: "rgba(255,255,255,0.9)",
  textDecoration: "none",
  fontSize: 14,
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
};

const heroContent: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  minHeight: "70vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "0 24px",
};

const heroTitle: React.CSSProperties = {
  fontSize: 72,
  fontWeight: 900,
  letterSpacing: -1.2,
  margin: 0,
};

const heroSub: React.CSSProperties = {
  marginTop: 18,
  fontSize: 20,
  opacity: 0.9,
  lineHeight: 1.5,
};

const footer: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  left: 0,
  width: "100%",
  textAlign: "center",
  fontSize: 12,
  opacity: 0.6,
  zIndex: 2,
};
