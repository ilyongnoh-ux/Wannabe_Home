// web/middleware.ts
// ============================================================
// KFIT Portal (Next.js) - Middleware (Edge)
//  - 목적(안전한 접근제어):
//    1) /dashboard : 로그인 필요
//    2) /download  : 로그인 + 구독(is_subscriber) 필요
//
//  - 원칙(CTO 판단):
//    * 권한 판단의 단일 진실은 FastAPI(/me) 응답이다.
//    * 미들웨어는 "우회 차단"만 담당하고, UI/기능은 기존 흐름을 유지한다.
//    * 장애/오류 시에는 "보호 우선" (확인 불가 = 접근 불가) 로 설계한다.
//      -> 운영에서 다운로드는 특히 보수적으로 막는 게 맞다.
//
//  - 2026-01-02 추가:
//    3) /admin : 로그인 + role=admin 필요
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;
const SESSION_HEADER_NAME = "x-session-id";
const SESSION_COOKIE_NAMES = ["__Host-kfit_sid", "kfit_sid"] as const;

type Me = {
  id: number;
  email: string;
  name: string;
  created_at: string;
  role?: string;
  plan?: string | null;
  is_subscriber?: boolean | null;
};

function extractSid(req: NextRequest): string | null {
  // 1) 헤더(디버그/점진 이행)
  const h = req.headers.get(SESSION_HEADER_NAME);
  if (h && h.trim()) return h.trim();

  // 2) 쿠키
  for (const name of SESSION_COOKIE_NAMES) {
    const v = req.cookies.get(name)?.value;
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function isPlainMe(x: any): x is Me {
  return x && typeof x === "object" && typeof x.email === "string" && typeof x.name === "string";
}

async function fetchMeBySid(sid: string): Promise<Me | null> {
  try {
    const res = await fetch(`${API_BASE}/me`, {
      method: "GET",
      headers: { [SESSION_HEADER_NAME]: sid },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();
    return isPlainMe(json) ? json : null;
  } catch {
    return null;
  }
}

function redirectToLogin(req: NextRequest, reason: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("reason", reason);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function redirectToDashboard(req: NextRequest, reason: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/dashboard";
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 보호 대상 라우트 정의
  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/download") ||
    pathname.startsWith("/admin");
  const needsSubscriber = pathname.startsWith("/download");
  const needsAdmin = pathname.startsWith("/admin");

  if (!needsAuth) {
    return NextResponse.next();
  }

  // 1) 세션 없으면 즉시 로그인으로
  const sid = extractSid(req);
  if (!sid) {
    return redirectToLogin(req, "no_session");
  }

  // 2) FastAPI /me로 검증(단일 진실)
  const me = await fetchMeBySid(sid);
  if (!me) {
    // 세션이 만료/무효이거나, 확인 불가(장애) → 보호 우선
    return redirectToLogin(req, "invalid_or_unreachable");
  }

  // 3) 다운로드는 구독자만
  const isSubscriber = Boolean(me.is_subscriber);
  if (needsSubscriber && !isSubscriber) {
    return redirectToDashboard(req, "need_subscription");
  }

  // 4) 관리자 페이지는 admin만
  // NOTE(운영/감사 관점):
  // - role은 현재 /me 응답에서 ADMIN_EMAILS 정책으로 계산된다.
  // - 추후 users.role 컬럼으로 이관되더라도, 이 조건은 "단일 진실(/me)"만 바라보므로
  //   미들웨어 코드는 그대로 유지 가능하다.
  const role = (me.role || "").toLowerCase();
  if (needsAdmin && role !== "admin") {
    return redirectToDashboard(req, "need_admin");
  }

  return NextResponse.next();
}

// 미들웨어 적용 경로
export const config = {
  matcher: ["/dashboard/:path*", "/download/:path*", "/admin/:path*"],
};

/*
[변경 요약]
- ✅ (추가) /admin 보호: 로그인 + me.role === "admin"
- ✅ 기존 /dashboard(로그인) /download(로그인+구독) 정책 그대로 유지
- ✅ 권한 판단 단일 진실은 여전히 FastAPI /me

[수정 전/후 줄수]
- 전: 133줄
- 후: 154줄

[체크리스트]
- ✅ UI 유지됨 (화면 변경 없음, 라우팅만 보호)
- ✅ 수정 범위: middleware의 보호 조건 확장만
- ✅ 기존 로직/구조/주석 최대한 존치
- ✅ Download 메뉴 토글과 실제 접근제어 일치 유지
*/
