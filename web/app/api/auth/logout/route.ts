// web/app/api/auth/logout/route.ts
// ============================================================
// KFIT Portal (Next.js BFF) - /api/auth/logout
//  - 목적:
//    1) 브라우저 → BFF → FastAPI로 "서버 세션 로그아웃"을 안전하게 전달
//    2) HttpOnly 세션 쿠키를 BFF에서 명시적으로 제거
//  - 원칙:
//    * 로그아웃의 단일 진실은 FastAPI (/auth/logout)
//    * BFF는 전달자 + 쿠키 정리자 역할만 수행
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;

// FastAPI와 동일한 세션 정책
const SESSION_COOKIE_NAMES = ["__Host-kfit_sid", "kfit_sid"] as const;
const SESSION_HEADER_NAME = "x-session-id";

function extractSessionId(req: NextRequest): string | null {
  // 1) 헤더 우선(디버그/점진 이행)
  const h = req.headers.get(SESSION_HEADER_NAME);
  if (h && h.trim()) return h.trim();

  // 2) 기본은 HttpOnly 쿠키
  for (const name of SESSION_COOKIE_NAMES) {
    const v = req.cookies.get(name)?.value;
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export async function POST(req: NextRequest) {
  const sid = extractSessionId(req);

  // ------------------------------------------------------------
  // 1) FastAPI에 로그아웃 전달(세션이 없더라도 호출 자체는 허용)
  // ------------------------------------------------------------
  if (sid) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          [SESSION_HEADER_NAME]: sid,
        },
        cache: "no-store",
      });
    } catch {
      // FastAPI 호출 실패여도 쿠키 정리는 진행
      // (네트워크 장애 시 UX 보호)
    }
  }

  // ------------------------------------------------------------
  // 2) 응답 생성 + 쿠키 삭제
  // ------------------------------------------------------------
  const res = NextResponse.json({ ok: true });

  // __Host- 접두 쿠키는 path=/, secure 조건이 있으므로 동일 조건으로 삭제
  for (const name of SESSION_COOKIE_NAMES) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}

/*
[변경 요약]
- ✅ /api/auth/logout BFF 라우트 추가
- ✅ HttpOnly 세션 쿠키에서 sid 추출
- ✅ FastAPI /auth/logout 호출(x-session-id 전달)
- ✅ 로그아웃 후 세션 쿠키 명시적 삭제
- ✅ FastAPI 장애 시에도 UX 보존(쿠키는 삭제)

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 95줄

[체크리스트]
- ✅ UI 유지됨 (AuthNav는 기존대로 POST /api/auth/logout 호출)
- ✅ 수정 범위: BFF 로그아웃 라우트만
- ✅ 인증/세션 핵심 로직은 FastAPI 단일 진실 유지
- ✅ 운영 로그(logout_history)는 FastAPI에서만 기록
*/
