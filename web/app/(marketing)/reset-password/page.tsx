"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const sp = useSearchParams();

  // URL: /reset-password?token=...
  const token = useMemo(() => sp.get("token") ?? "", [sp]);

  const [newPassword, setNewPassword] = useState("NewPass1234");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string }>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!token) {
      setResult({ ok: false, message: "토큰이 없습니다. 재설정 링크를 다시 발급받아 주세요." });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setResult({ ok: false, message: "비밀번호는 8자 이상이어야 합니다." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // FastAPI detail 메시지를 최대한 보여줌
        const detail =
          (data && (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail))) ||
          (data && typeof data === "string" ? data : "") ||
          "";
        setResult({
          ok: false,
          message: `실패 (${res.status}) ${detail}`.trim(),
        });
        return;
      }

      setResult({ ok: true, message: "비밀번호가 변경되었습니다. 이제 로그인 해주세요." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>비밀번호 재설정</h1>
      <p style={{ color: "#6b7280", marginTop: 8 }}>
        링크는 1회용입니다. 한 번 성공하면 같은 링크로는 다시 변경할 수 없습니다.
      </p>

      <div style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>토큰</div>
        <div
          style={{
            padding: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            wordBreak: "break-all",
            background: "#fafafa",
          }}
        >
          {token ? token : "(token 없음)"}
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>새 비밀번호</span>
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8자 이상"
            type="password"
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
          {loading ? "변경 중..." : "비밀번호 변경"}
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
            whiteSpace: "pre-wrap",
          }}
        >
          {result.message}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 14, display: "flex", gap: 12 }}>
        <Link href="/login" style={{ color: "#2563eb" }}>
          로그인으로 이동
        </Link>
        <Link href="/forgot-password" style={{ color: "#2563eb" }}>
          재설정 링크 다시 발급
        </Link>
      </div>
    </main>
  );
}
