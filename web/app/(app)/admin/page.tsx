// web/app/admin/page.tsx
"use client";

/**
 * ============================================================
 * Admin Page (관리자 전용 - 최소 골격)
 * ------------------------------------------------------------
 * CTO 의도(안전):
 * - AuthNav에서 admin 계정에게 "관리자" 링크가 노출되므로
 *   404 없이 동선이 이어지도록 최소 페이지를 먼저 둔다.
 * - 실제 관리자 기능(구독 플립/사용자 등급 변경/세션 강제 종료)은
 *   다음 단계에서 API와 함께 붙인다.
 *
 * 접근 제어:
 * - 현재는 UI 골격만. (보호는 추후: middleware matcher에 /admin 추가 + /me.role 확인)
 * - 단, 페이지 자체에서도 /api/me로 2차 확인하여 비관리자면 안내한다.
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

export default function AdminPage() {
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
    refresh();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 13,
    opacity: 0.92,
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

  if (loading) {
    return (
      <div style={heroStyle}>
        <div style={cardStyle}>
          <p style={descStyle}>확인 중…</p>
        </div>
      </div>
    );
  }

  if (!data || data.authenticated === false) {
    return (
      <div style={heroStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Admin</h1>
          <p style={descStyle}>
            로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요.
            {data?.reason ? <span style={{ opacity: 0.7 }}> (reason: {data.reason})</span> : null}
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <Link href="/login" style={{ ...btnStyle, textDecoration: "none", display: "inline-flex" }}>
              로그인
            </Link>
            <Link href="/" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const me = data.me;
  const isAdmin = (me.role || "").toLowerCase() === "admin";

  if (!isAdmin) {
    return (
      <div style={heroStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Admin</h1>
          <p style={descStyle}>이 페이지는 관리자만 접근할 수 있습니다.</p>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <span style={pillStyle}>
              계정: {me.email} ({me.role || "user"})
            </span>
            <span style={pillStyle}>플랜: {me.plan || "free"}</span>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Link href="/dashboard" style={{ ...btnStyle, textDecoration: "none", display: "inline-flex" }}>
              대시보드로
            </Link>
            <Link href="/company" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
              Company
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ✅ 관리자 전용(골격)
  return (
    <div style={heroStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Admin</h1>
        <p style={descStyle}>
          관리자 콘솔(초기 골격)입니다. 지금은 동선/권한/운영 진실을 먼저 고정합니다.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <span style={pillStyle}>
            계정: {me.email} ({me.role})
          </span>
          <span style={pillStyle}>플랜: {me.plan || "free"}</span>
          <span style={pillStyle}>구독: {me.is_subscriber ? "active" : "inactive"}</span>
        </div>

        <div style={{ marginTop: 16, opacity: 0.86, fontSize: 14, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>다음 단계(관리자 기능)</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>사용자 목록 조회(검색/필터)</li>
            <li>구독 활성화/비활성화 토글(관리자 플립)</li>
            <li>plan 변경(free/pro/enterprise)</li>
            <li>세션 강제 종료(kill session / kill all sessions)</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{ ...btnStyle, textDecoration: "none", display: "inline-flex" }}>
            대시보드
          </Link>
          <Link href="/service" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
            Service
          </Link>
        </div>
      </div>
    </div>
  );
}

/*
[변경 요약]
- ✅ /admin 페이지 추가(관리자 링크 404 방지)
- ✅ /api/me로 로그인/role 2차 확인
- ✅ 관리자면 콘솔 골격, 비관리자면 안내 UX
- ✅ 실제 관리자 기능은 다음 단계로 분리(운영 리스크 최소화)

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 285줄

[체크리스트]
- ✅ UI 유지/존치: 기존 다크/카드 톤과 충돌 없음
- ✅ 수정 범위: 신규 페이지 추가만
- ✅ 인증/세션/권한 핵심 로직 변경 없음
*/
