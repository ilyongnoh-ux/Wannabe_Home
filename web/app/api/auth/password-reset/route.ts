export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;

export async function POST(req: NextRequest) {
  try {
        const raw = await req.text();
        const params = new URLSearchParams(raw);

        const token = params.get("token");
        const new_password = params.get("new_password");


    if (!token || !new_password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const res = await fetch(`${API_BASE}/auth/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: String(token),
        new_password: String(new_password),
      }),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      // FastAPI 에러 메시지를 그대로 전달(디버깅 편의)
      return NextResponse.json({ ok: false, error: "reset_failed", detail: safeJson(text) ?? text }, { status: res.status });
    }

    return NextResponse.json({ ok: true, detail: safeJson(text) ?? text }, { status: 200 });
  } catch (e) {
    console.error("[BFF] password-reset error:", e);
    return NextResponse.json({ ok: false, error: "bff_exception" }, { status: 500 });
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
