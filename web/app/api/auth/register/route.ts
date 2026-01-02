// web/app/api/auth/register/route.ts
// ============================================================
// KFIT Portal (Next.js BFF) - /api/auth/register
//  - 목적:
//    1) 브라우저 회원가입 폼 → BFF → FastAPI(/auth/register) 서버-서버 호출
//    2) README 헌법 준수: "가입 후 자동 로그인 OFF" 정책 유지
//       * 즉, 여기서는 쿠키를 세팅하지 않는다.
//  - 원칙(안전):
//    * 계정 생성의 단일 진실은 FastAPI에 둔다.
//    * BFF는 전달/응답 정리만 수행한다.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;

export async function POST(req: NextRequest) {
  // 폼/JSON 어떤 방식이든 수용 가능하게 방어(현재는 formData 우선)
  let email: string | null = null;
  let password: string | null = null;
  let name: string | null = null;

  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => null);
      email = body?.email ?? null;
      password = body?.password ?? null;
      name = body?.name ?? null;
    } else {
      const form = await req.formData();
      email = (form.get("email") as string) ?? null;
      password = (form.get("password") as string) ?? null;
      name = (form.get("name") as string) ?? null;
    }
  } catch {
    // 파싱 실패 → 아래 검증에서 처리
  }

  if (!email || !password || !name) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  // ------------------------------------------------------------
  // 1) FastAPI로 회원가입 서버-서버 호출
  // ------------------------------------------------------------
  const upstream = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: String(email),
      password: String(password),
      name: String(name),
    }),
    cache: "no-store",
  });

  // FastAPI의 상태를 최대한 보존(프론트에서 에러 메시지 분기 가능)
  if (!upstream.ok) {
    let detail: any = null;
    try {
      detail = await upstream.json();
    } catch {
      // ignore
    }
    return NextResponse.json(
      { ok: false, error: "Register failed", detail },
      { status: upstream.status }
    );
  }

  // ------------------------------------------------------------
  // 2) 성공: 유저 정보 반환(자동 로그인 OFF)
  // ------------------------------------------------------------
  const user = await upstream.json();
  return NextResponse.json({ ok: true, user }, { status: 200 });
}

/*
[변경 요약]
- ✅ /api/auth/register BFF 라우트 추가
- ✅ FastAPI /auth/register 서버-서버 호출
- ✅ README 헌법 준수: 가입 후 자동 로그인 OFF (쿠키 세팅 없음)
- ✅ formData / JSON 입력 둘 다 수용(운영 안정성)

[수정 전/후 줄수]
- 전: (신규 파일)
- 후: 약 118줄

[체크리스트]
- ✅ UI 유지됨 (회원가입 폼은 그대로 /api/auth/register 호출)
- ✅ 수정 범위: BFF 회원가입 라우트만
- ✅ 인증/세션 핵심 로직 변경 없음
*/
