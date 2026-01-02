// web/app/api/auth/register/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;

/**
 * [특허/명세서용 주석]
 * - 목적: 외부 공개 홈페이지에서 "가입 신청" UI를 제공하되,
 *         실제 인증 토큰은 브라우저에 직접 노출하지 않고 BFF(Next.js)가 중계한다.
 * - 특징:
 *   1) 클라이언트 → Next(BFF)로 폼 전송
 *   2) Next(BFF) → FastAPI /auth/register 서버-서버 호출
 *   3) 응답은 성공/실패만 반환 (토큰/세션 처리 없음)
 * - 보안 설계:
 *   - HttpOnly 쿠키는 login 단계에서만 발급한다.
 *   - register 단계는 계정 생성(또는 신청)만 담당.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const email = form.get("email");
    const password = form.get("password");
    const name = form.get("name");

    if (!email || !password || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // FastAPI로 서버-서버 회원가입(가입신청) 호출
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: String(email),
        password: String(password),
        name: String(name),
      }),
      cache: "no-store",
    });

    // FastAPI가 반환하는 에러 메시지를 최대한 그대로 전달(디버깅/운영 편의)
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "register_failed", detail: safeJson(text) ?? text },
        { status: res.status }
      );
    }

    // 성공 시: ok만 반환. (로그인은 /login에서 따로 수행)
    return NextResponse.json({ ok: true, detail: safeJson(text) ?? text }, { status: 200 });
  } catch (err) {
    console.error("[/api/auth/register] ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "bff_exception" },
      { status: 500 }
    );
  }
}

/**
 * FastAPI 응답이 JSON 문자열일 수도 / 아닐 수도 있으므로 안전 파싱.
 */
function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
