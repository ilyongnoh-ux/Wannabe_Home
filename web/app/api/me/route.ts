// web/app/api/me/route.ts
// ============================================================
// KFIT Portal (Next.js BFF) - /api/me
//  - 목적: 브라우저가 FastAPI(/me)를 직접 때리지 않게 하고,
//         HttpOnly 쿠키 기반 세션을 "서버(BFF)"가 안전하게 전달한다.
//  - 정책: AuthNav가 래핑/단독 포맷을 모두 수용하므로,
//         여기서는 운영 안정성을 위해 "래핑 형태"로 통일해서 반환한다.
//    * { authenticated: true, me: {...} }
//    * { authenticated: false, reason?: string }
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;

// FastAPI와 동일한 세션 쿠키명 정책을 맞춘다.
const SESSION_COOKIE_NAMES = ["__Host-kfit_sid", "kfit_sid"] as const;
const SESSION_HEADER_NAME = "x-session-id";

// Me 응답 형태(백엔드 확장 필드 포함)
type Me = {
  id: number;
  email: string;
  name: string;
  created_at: string;
  role?: string;
  plan?: string | null;
  is_subscriber?: boolean | null;
};

function extractSessionId(req: NextRequest): string | null {
  // 1) 클라이언트가 헤더로 넘기는 경우(디버그/점진 이행)
  const h = req.headers.get(SESSION_HEADER_NAME);
  if (h && h.trim()) return h.trim();

  // 2) 기본은 HttpOnly 쿠키에서 읽는다.
  for (const name of SESSION_COOKIE_NAMES) {
    const v = req.cookies.get(name)?.value;
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function isPlainMe(x: any): x is Me {
  return x && typeof x === "object" && typeof x.email === "string" && typeof x.name === "string";
}

export async function GET(req: NextRequest) {
  // ✅ 세션이 없으면 즉시 비로그인
  const sid = extractSessionId(req);
  if (!sid) {
    return NextResponse.json({ authenticated: false, reason: "no_session" }, { status: 200 });
  }

  try {
    // ✅ BFF → FastAPI: 세션을 헤더로 전달(쿠키 직접 전달은 인프라별로 변동 여지 있음)
    const res = await fetch(`${API_BASE}/me`, {
      method: "GET",
      headers: {
        [SESSION_HEADER_NAME]: sid,
      },
      cache: "no-store",
    });

    // FastAPI가 401/403이면 비로그인으로 정리
    if (!res.ok) {
      return NextResponse.json(
        { authenticated: false, reason: `upstream_${res.status}` },
        { status: 200 }
      );
    }

    const json = await res.json();

    // FastAPI가 UserOut 형태(plain me)로 내려오는 것이 정상
    if (isPlainMe(json)) {
      return NextResponse.json({ authenticated: true, me: json }, { status: 200 });
    }

    // 예상치 못한 응답(형태 불일치)
    return NextResponse.json({ authenticated: false, reason: "invalid_shape" }, { status: 200 });
  } catch {
    // 네트워크/환경변수/API_BASE 문제 등
    return NextResponse.json({ authenticated: false, reason: "bff_error" }, { status: 200 });
  }
}

/*
[변경 요약]
- ✅ /api/me BFF 라우트 신설(또는 기존 파일을 이 내용으로 통일)
- ✅ HttpOnly 세션 쿠키(__Host-kfit_sid/kfit_sid)에서 sid 추출
- ✅ FastAPI /me 호출 시 x-session-id로 전달
- ✅ 프론트(AuthNav) 안정성을 위해 래핑 형태로 반환:
  - authenticated=true → { me }
  - authenticated=false → { reason }

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 118줄

[체크리스트]
- ✅ UI 유지됨 (BFF 라우트 추가/정리만)
- ✅ 수정 범위: BFF(/api/me)만
- ✅ 인증/세션 로직(백엔드) 변경 없음
*/
