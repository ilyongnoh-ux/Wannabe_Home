"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("test@test.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string }>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setResult({
          ok: false,
          message: `요청 실패 (${res.status})`,
        });
        console.error("reset-request failed:", data);
        return;
      }

      // 보안상 “계정 존재 여부”를 말하지 않는 게 정상
      setResult({
        ok: true,
        message: "요청이 접수되었습니다. 서버 로그에 재설정 링크가 출력됩니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>비밀번호 찾기</h1>
      <p style={{ color: "#6b7280", marginTop: 8 }}>
        이메일을 입력하면 비밀번호 재설정 링크가 발급됩니다. (현재는 서버 로그 출력 방식)
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>이메일</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            type="email"
            required
            style={{
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              outline: "none",
              fontSize: 14,
            }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111827",
            background: loading ? "#e5e7eb" : "#111827",
            color: loading ? "#111827" : "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "요청 중..." : "재설정 링크 발급"}
        </button>
      </form>

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${result.ok ? "#10b981" : "#ef4444"}`,
            background: "#ffffff",
            color: "#111827",
            fontSize: 14,
          }}
        >
          {result.message}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/login" style={{ color: "#2563eb" }}>
          로그인으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
