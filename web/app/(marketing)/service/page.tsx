// web/app/service/page.tsx
"use client";

/**
 * ============================================================
 * Service Page (구독 안내/서비스 소개)
 * ------------------------------------------------------------
 * CTO 의도(안전):
 * - 네비게이션에서 Company/Service/Download 링크가 이미 노출되기 시작했으므로,
 *   "404 없이" 흐름이 이어지도록 최소 골격 페이지를 먼저 둔다.
 * - 결제/구독 활성화는 다음 단계(결제 연동 or 관리자 플립)에서 붙인다.
 * - 현재 페이지는:
 *   1) 서비스 설명
 *   2) 구독 필요성 안내
 *   3) 로그인/대시보드로 동선 연결
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

export default function ServicePage() {
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

  const subTitleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: 0.2,
    margin: "14px 0 6px 0",
    opacity: 0.96,
  };

  const descStyle: React.CSSProperties = {
    opacity: 0.86,
    margin: 0,
    lineHeight: 1.7,
    fontSize: 14,
  };

  const listStyle: React.CSSProperties = {
    margin: "10px 0 0 0",
    paddingLeft: 18,
    opacity: 0.86,
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

  const me = data && data.authenticated ? data.me : null;
  const isSubscriber = Boolean(me?.is_subscriber);

  return (
    <div style={heroStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Service</h1>
        <p style={descStyle}>
          KFIT 서비스는 “업무를 빠르게, 실수를 줄이게” 만드는 내부 도구입니다.
          <br />
          구독은 기능을 늘리기 위한 장식이 아니라, 운영 안정성(다운로드/업데이트/권한관리)을 위한{" "}
          <b>선 넘는 기준</b>입니다.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <span style={pillStyle}>정책: 구독자만 Download</span>
          <span style={pillStyle}>기준: /me.is_subscriber 단일 진실</span>
          <span style={pillStyle}>보안: HttpOnly 세션 + 서버 세션 DB</span>
        </div>

        <h2 style={subTitleStyle}>포함 기능(현재/예정)</h2>
        <ul style={listStyle}>
          <li>대시보드 기반 업무 흐름(상담/고객/리포트)</li>
          <li>구독자 전용 다운로드(배포/버전/릴리즈 노트)</li>
          <li>운영 로그(로그인/로그아웃/세션)</li>
          <li>향후: 결제 연동, 권한 관리, 관리자 콘솔</li>
        </ul>

        <h2 style={subTitleStyle}>내 상태</h2>
        {loading ? (
          <p style={descStyle}>확인 중…</p>
        ) : !me ? (
          <p style={descStyle}>
            아직 로그인하지 않았습니다. 로그인 후 대시보드에서 구독 상태를 확인할 수 있습니다.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={pillStyle}>
              계정: {me.email} ({me.role || "user"})
            </span>
            <span style={pillStyle}>플랜: {me.plan || "free"}</span>
            <span style={pillStyle}>구독: {isSubscriber ? "active" : "inactive"}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {!me ? (
            <Link href="/login" style={{ ...btnStyle, textDecoration: "none", display: "inline-flex" }}>
              로그인
            </Link>
          ) : (
            <Link href="/dashboard" style={{ ...btnStyle, textDecoration: "none", display: "inline-flex" }}>
              대시보드
            </Link>
          )}

          <Link href="/company" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
            Company
          </Link>

          <Link href="/download" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
            Download
          </Link>
        </div>

        <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, lineHeight: 1.6 }}>
          <div>• 다음 단계(CTO 플랜): 구독 활성화 경로(관리자 토글 or 결제 연동) 확정</div>
          <div>• 기준은 단순하게: is_subscriber 하나로 모든 메뉴/권한을 통일</div>
        </div>
      </div>
    </div>
  );
}

/*
[변경 요약]
- ✅ /service 페이지 추가(404 방지 + 구독 안내 동선 확보)
- ✅ /api/me 기반으로 현재 사용자/구독 상태 표시(안전, 읽기 전용)
- ✅ 결제/구독 활성화는 다음 단계로 분리(운영 리스크 최소화)

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 245줄

[체크리스트]
- ✅ UI 유지/존치: 기존 다크/반투명 카드 톤과 충돌 없이 단독 페이지로 구성
- ✅ 수정 범위: 신규 페이지 추가만
- ✅ 인증/세션 핵심 로직 변경 없음
*/
