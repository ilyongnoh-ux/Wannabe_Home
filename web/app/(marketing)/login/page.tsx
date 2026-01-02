// web/app/login/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // ✅ Open Redirect 방지: 내부 경로만 허용
  const nextPath = useMemo(() => {
    const n = sp.get("next");
    if (!n) return "/dashboard";
    if (!n.startsWith("/")) return "/dashboard";
    if (n.startsWith("//")) return "/dashboard";
    return n;
  }, [sp]);

  const [username, setUsername] = useState("test@test.com");
  const [password, setPassword] = useState("string");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setError(data?.error || "로그인 실패");
        return;
      }

      // ✅ 로그인 성공 → 원래 가려던 페이지로 복귀
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Login</h1>
        <p style={{ color: "#666", marginTop: 8 }}>
          로그인 후 <code>{nextPath}</code> 로 이동합니다.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </label>

          {error ? <div style={{ color: "crimson" }}>{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #111827",
              background: loading ? "#e5e7eb" : "#111827",
              color: loading ? "#111827" : "#ffffff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          {/* ✅ 회원가입 기능 붙였으니 링크 활성화 */}
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            style={{ fontSize: 13, opacity: 0.85, textDecoration: "underline" }}
          >
            계정이 없으신가요? 회원가입
          </Link>
        </form>

        <div style={{ marginTop: 16, fontSize: 14, display: "flex", gap: 16 }}>
          <Link href="/forgot-password" style={{ color: "#2563eb" }}>
            비밀번호를 잊으셨나요?
          </Link>
        </div>

        <p style={{ marginTop: 14 }}>
          <Link href="/">홈으로</Link>
        </p>
      </div>
    </main>
  );
}
