export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.KFIT_API_BASE_URL!;

export async function POST(req: NextRequest) {
  try {
    // ✅ urlencoded는 formData() 대신 text()로 받고 URLSearchParams로 파싱
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const email = params.get("email");

    if (!email) {
      return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    }

    const res = await fetch(`${API_BASE}/auth/password-reset-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ email }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "upstream_failed", detail },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[BFF] password-reset-request error:", e);
    return NextResponse.json({ ok: false, error: "bff_exception" }, { status: 500 });
  }
}
