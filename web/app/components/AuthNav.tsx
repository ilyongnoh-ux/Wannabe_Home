// web/app/components/AuthNav.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Me = {
  id: number;
  email: string;
  name: string;
  created_at: string;
  role?: string;

  // ✅ (안전 확장) /me 응답 확장 필드 수용
  plan?: string | null;
  is_subscriber?: boolean | null;
};

type MeResponse =
  | { authenticated: true; me: Me }
  | { authenticated: false; reason?: string };

function isWrappedMe(x: any): x is { authenticated: true; me: Me } {
  return x && typeof x === "object" && x.authenticated === true && x.me && typeof x.me === "object";
}

function isPlainMe(x: any): x is Me {
  return x && typeof x === "object" && typeof x.email === "string" && typeof x.name === "string";
}

/**
 * UI/운영 정책(CTO 결정):
 * - Hero(랜딩) 규칙과 App(대시보드) 규칙을 "variant"로 분리해서 충돌 방지
 *
 * variant="hero"(기본):
 *  - 로그아웃: Company | 로그인  (요구사항 고정)
 *
 * variant="app":
 *  - 상단에 Home을 추가해서 Hero(/)로 빠르게 돌아갈 수 있게 함
 */
export default function AuthNav({ variant = "hero" }: { variant?: "hero" | "app" }) {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 운영 안정화: 중복 호출/언마운트 setState 방지
  const inflightRef = useRef(false);
  const mountedRef = useRef(false);

  async function refresh() {
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    await refresh();
  }

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Pipe = () => <span style={pipeStyle}>|</span>;

  if (loading) {
    return <span style={{ opacity: 0.8, fontSize: 14 }}>확인 중…</span>;
  }

  // ------------------------------------------------------------
  // 로그아웃 상태
  //  - hero: Company | 로그인 (요구사항 고정)
  //  - app : (대시보드는 미들웨어로 로그아웃 접근이 원칙상 거의 없지만) 동일 규칙 유지
  // ------------------------------------------------------------
  if (!data || data.authenticated === false) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/company" style={linkStyle}>
          Company
        </Link>
        <Pipe />
        <Link href="/login" style={linkStyle}>
          로그인
        </Link>
      </div>
    );
  }

  const me = data.me;
  const roleLabel = me.role || "user";
  const isSubscriber = Boolean(me.is_subscriber);

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      {/* ✅ app(대시보드)에서는 Home 제공 (Hero 규칙과 충돌 방지) */}
      {variant === "app" && (
        <Link href="/" style={linkStyle}>
          Home
        </Link>
      )}

      <Link href="/company" style={linkStyle}>
        Company
      </Link>

      <Link href="/service" style={linkStyle}>
        Service
      </Link>

      {isSubscriber && (
        <Link href="/download" style={linkStyle}>
          Download
        </Link>
      )}

      <Pipe />

      <span style={{ fontSize: 13, opacity: 0.9 }}>
        {me.email} <span style={{ opacity: 0.7 }}>({roleLabel})</span>
      </span>

      <Link href="/dashboard" style={linkStyle}>
        대시보드
      </Link>

      {me.role === "admin" && (
        <Link href="/admin" style={linkStyle}>
          관리자
        </Link>
      )}

      <button onClick={logout} style={btnStyle} type="button">
        로그아웃
      </button>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.92)",
  textDecoration: "none",
  fontSize: 14,
  letterSpacing: 0.2,
};

const pipeStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.45)",
  fontSize: 14,
  padding: "0 2px",
  userSelect: "none",
};

const btnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "rgba(255,255,255,0.92)",
  padding: "6px 10px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 13,
};

/*
[수정 전/후 줄수]
- 전: 약 223줄
- 후: 약 250줄 내외 (variant 추가)

[체크리스트]
- ✅ Hero(로그아웃) 규칙 유지: Company | 로그인
- ✅ Dashboard(App)에서만 Home 메뉴 추가 가능(variant="app")
- ✅ 구독자만 Download 노출 유지
- ✅ 인증/세션 로직 변경 없음
*/
