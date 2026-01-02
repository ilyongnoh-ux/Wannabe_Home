// web/app/download/page.tsx
"use client";

/**
 * ============================================================
 * Download Page (구독자 전용)
 * ------------------------------------------------------------
 * CTO 의도:
 * - "다운로드"는 유료 구독자에게만 노출/허용되는 핵심 권한 지점이다.
 * - 접근 제어의 1차 방어는 middleware(/download 보호)가 담당한다.
 * - 이 페이지는 2차 방어로 /api/me를 다시 확인하고,
 *   구독 상태에 따라 UX(안내/다운로드 버튼)를 다르게 보여준다.
 *
 * NOTE:
 * - 실제 파일 다운로드 목록/버전 관리/릴리즈 노트는 다음 단계에서 붙인다.
 * - 현재는 네비게이션/권한/페이지 동선이 끊기지 않도록 "안전한 골격"만 제공한다.
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

export default function DownloadPage() {
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

      // /api/me는 래핑 형태로 통일했으므로, 그 외는 비정상으로 처리
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
    maxWidth: 860,
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 18,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 0.2,
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    opacity: 0.85,
    margin: 0,
    lineHeight: 1.6,
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
    fontWeight: 700,
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

  // ✅ 2차 방어: 페이지에서 한 번 더 확인
  if (!data || data.authenticated === false) {
    return (
      <div style={heroStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Download</h1>
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
  const isSubscriber = Boolean(me.is_subscriber);

  if (!isSubscriber) {
    // middleware가 막아줄 확률이 높지만, 혹시 우회/예외 상황 대비
    return (
      <div style={heroStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Download</h1>
          <p style={descStyle}>
            현재 계정은 구독이 활성화되어 있지 않아 다운로드를 사용할 수 없습니다.
          </p>

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
            <Link href="/service" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
              구독 안내(서비스)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ✅ 구독자
  return (
    <div style={heroStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Download</h1>
        <p style={descStyle}>
          구독이 활성화된 계정입니다. 아래에서 최신 버전을 다운로드할 수 있습니다.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <span style={pillStyle}>
            계정: {me.email} ({me.role || "user"})
          </span>
          <span style={pillStyle}>플랜: {me.plan || "pro"}</span>
          <span style={pillStyle}>권한: subscriber</span>
        </div>

        {/* 실제 배포 파일/버전은 다음 단계에서 연결 */}
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button
            type="button"
            style={btnStyle}
            onClick={() => alert("다음 단계: 실제 다운로드 파일(릴리즈) 연결")}
          >
            KFITER 다운로드(예정)
          </button>
          <Link href="/dashboard" style={{ ...ghostBtnStyle, textDecoration: "none", display: "inline-flex" }}>
            대시보드
          </Link>
        </div>

        <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, lineHeight: 1.6 }}>
          <div>• 다음 작업: 다운로드 파일(릴리즈) 목록/버전/체크섬/변경이력(Release Notes) 연결</div>
          <div>• 운영: 다운로드는 항상 “구독자 여부”를 단일 기준으로 판단</div>
        </div>
      </div>
    </div>
  );
}

/*
[변경 요약]
- ✅ /download 페이지 추가(구독자 전용 동선 골격)
- ✅ 2차 방어: /api/me로 구독 여부 재확인(미들웨어와 정책 일치)
- ✅ 비구독자/비로그인 시 안내 UX 제공
- ✅ 실제 다운로드 링크는 다음 단계에서 연결(릴리즈/파일 관리)

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 235줄

[체크리스트]
- ✅ UI 유지/존치: 기존 톤(다크/반투명 카드)과 충돌 없이 단독 페이지로 구성
- ✅ 수정 범위: 신규 페이지 추가만
- ✅ 인증/세션 핵심 로직 변경 없음
*/
