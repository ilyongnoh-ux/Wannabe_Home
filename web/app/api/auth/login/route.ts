// web/app/api/auth/login/route.ts
// ============================================================
// KFIT Portal (Next.js BFF) - /api/auth/login
//  - 목적:
//    1) 브라우저 로그인 폼 → BFF → FastAPI(/auth/login) 서버-서버 호출
//    2) FastAPI가 발급한 session_id를 BFF가 HttpOnly 쿠키로 저장
//       * 운영 권장: __Host-kfit_sid (HTTPS + path=/ + domain 미지정)
//       * 로컬(dev, http)에서는 __Host- 규칙을 만족 못하므로 kfit_sid로 폴백
//
//  - 원칙(안전):
//    * 인증/권한의 단일 진실은 FastAPI에 둔다.
//    * BFF는 "세션 전달/쿠키 저장"만 담당한다.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;
const SESSION_HEADER_NAME = "x-session-id";

// 쿠키명 정책:
// - 운영(HTTPS): __Host-kfit_sid 권장
// - 로컬(HTTP): __Host 규칙(secure 필수)을 못 지키므로 kfit_sid 사용
const COOKIE_HOST = "__Host-kfit_sid";
const COOKIE_FALLBACK = "kfit_sid";

function isHttps(req: NextRequest): boolean {
  // Next.js 런타임에서 프로토콜은 배포 환경/프록시 설정에 따라 달라질 수 있다.
  // - production에선 보통 HTTPS로 서비스되므로 secure 쿠키를 기본으로 한다.
  // - dev/local에선 HTTP가 많으므로 폴백 쿠키를 사용한다.
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.toLowerCase().includes("https");
  return req.nextUrl.protocol === "https:";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = form.get("username");
  const password = form.get("password");

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 });
  }

  // ------------------------------------------------------------
  // 1) FastAPI로 서버-서버 로그인
  // ------------------------------------------------------------
  const upstream = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username: String(username),
      password: String(password),
    }),
    cache: "no-store",
  });

  if (!upstream.ok) {
    // FastAPI 응답을 그대로 단순화하여 전달
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: upstream.status });
  }

  const json = await upstream.json();

  // FastAPI SessionOut: { session_id: string }
  const sid = json?.session_id;
  if (!sid || typeof sid !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid session response" }, { status: 502 });
  }

  // ------------------------------------------------------------
  // 2) HttpOnly 쿠키 저장
  // ------------------------------------------------------------
  const https = isHttps(req);
  const res = NextResponse.json({ ok: true });

  // 운영: __Host- 쿠키는 secure=true, path="/", domain 미지정이어야 규칙을 만족
  // 로컬: https가 아니면 브라우저가 secure 쿠키를 저장하지 않으므로 폴백 사용
  const cookieName = https ? COOKIE_HOST : COOKIE_FALLBACK;

  res.cookies.set({
    name: cookieName,
    value: sid,
    httpOnly: true,
    secure: https, // production/https면 true
    sameSite: "lax",
    path: "/",
    // maxAge는 "세션 쿠키"로 두거나, 운영에서 명시할 수 있다.
    // 현재 FastAPI의 세션 만료는 서버가 관리하므로, 쿠키는 세션 형태로 둔다.
    // maxAge: 60 * 60 * 24 * 7,
  });

  // ------------------------------------------------------------
  // 3) (선택) 호환 쿠키 정리: 반대쪽 쿠키가 남아 혼선을 만들 수 있으니 삭제
  // ------------------------------------------------------------
  res.cookies.set({ name: https ? COOKIE_FALLBACK : COOKIE_HOST, value: "", path: "/", maxAge: 0 });

  return res;
}

/*
[변경 요약]
- ✅ /api/auth/login BFF 라우트 추가/정리
- ✅ FastAPI /auth/login 서버-서버 호출 (x-www-form-urlencoded)
- ✅ session_id 수신 → HttpOnly 쿠키 저장
  - HTTPS: __Host-kfit_sid (권장)
  - HTTP(dev): kfit_sid (폴백)
- ✅ 반대쪽 쿠키는 삭제하여 혼선 방지

[수정 전/후 줄수]
- 전: (신규 파일 또는 교체)
- 후: 약 140줄

[체크리스트]
- ✅ UI 유지됨 (로그인 폼은 그대로 /api/auth/login 호출)
- ✅ 수정 범위: BFF 로그인 라우트만
- ✅ 인증/권한의 단일 진실은 FastAPI 유지
- ✅ 세션 전달은 쿠키 기반으로 안정화
*/
