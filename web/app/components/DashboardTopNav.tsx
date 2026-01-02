// web/app/components/DashboardTopNav.tsx
"use client";

/**
 * ============================================================
 * DashboardTopNav (대시보드 전용 상단 네비게이션)
 * ------------------------------------------------------------
 * 대표님 정의(정확히 반영):
 *
 * 1) 로그인 상태(구독 O) 대시보드 상단:
 *    "Company Service Download test@test.com (agent) | Logout"
 *
 * 2) 로그인 상태(구독 X) 대시보드 상단:
 *    "Company Service test@test.com (agent) | Logout"
 *
 * 설계 원칙(안전):
 * - 화면(대시보드) 안에서만 쓰는 "축약형" 네비게이션 컴포넌트.
 * - 인증/세션의 단일 진실은 /api/me (BFF) 래핑 응답.
 * - 구독 토글은 me.is_subscriber 기반.
 * - logout은 /api/auth/logout(BFF) 단일 호출.
 *
 * 사용 방법:
 * - 대시보드 페이지 상단 원하는 위치에 <DashboardTopNav /> 한 줄 추가.
 * ============================================================
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  return x && typeof x === "object" && x.authenticated === true && x.me && typeof x.me === "object";
}

export default function DashboardTopNav() {
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

      // /api/me는 status 200 + 래핑으로 통일했지만, 혹시를 대비해 ok 체크 유지
      if (!res.ok) {
        if (mountedRef.current) setData({ authenticated: false, reason: `http_${res.status}` });
        return;
      }

      const json = await res.json();
      if (isWrappedMe(json)) {
        if (mountedRef.current) setData(json);
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
    return <div style={wrapStyle}>확인 중…</div>;
  }

  if (!data || data.authenticated === false) {
    // 대시보드 진입은 middleware가 막아줄 확률이 높지만,
    // 혹시 직접 렌더링된 상황 대비(보호 우선) 로그인 링크 제공
    return (
      <div style={wrapStyle}>
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
    <div style={wrapStyle}>
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

      <span style={{ fontSize: 13, opacity: 0.92 }}>
        {me.email} <span style={{ opacity: 0.7 }}>({roleLabel})</span>
      </span>

      <Pipe />

      <button type="button" onClick={logout} style={btnStyle}>
        Logout
      </button>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  padding: "10px 0",
};

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
[변경 요약]
- ✅ 대시보드 전용 상단 네비게이션 컴포넌트 추가
- ✅ 구독자면 Download 노출, 비구독이면 미노출 (is_subscriber 단일 기준)
- ✅ "Company Service (Download?) email(role) | Logout" 축약형 문구 정책 반영
- ✅ /api/me(BFF) 래핑 형태만 사용(운영 안정성)
- ✅ logout은 /api/auth/logout(BFF) 호출로 통일

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 210줄

[체크리스트]
- ✅ UI 유지/존치: 기존 톤과 동일한 link/button 스타일 사용
- ✅ 수정 범위: 신규 컴포넌트 추가만
- ✅ 인증/세션/권한 핵심 로직 변경 없음
*/
