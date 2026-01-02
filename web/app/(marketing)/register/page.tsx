// web/app/register/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * 회원가입 UI
 * - /register?next=/dashboard 같은 흐름도 지원
 * - ✅ 가입 성공 후 "자동 로그인"은 하지 않는다.
 *   → 로그인 페이지로 이동하여 사용자가 직접 로그인하도록 유도한다.
 *
 * 보안/구조 관점 메모:
 * - 가입 직후 자동 로그인(쿠키 세팅)을 생략하면,
 *   가입 단계와 인증 단계가 분리되어 운영/감사(로그) 측면에서 추적이 더 명확해진다.
 * - next 파라미터는 오픈리다이렉트 방지를 위해 "내부 경로"만 허용한다.
 */
export default function RegisterPage() {
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

  const [email, setEmail] = useState("test@test.com");
  const [name, setName] = useState("string");
  const [password, setPassword] = useState("string");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      // 1) 회원가입 (가입만 수행)
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      const regJson = await regRes.json().catch(() => ({} as any));

      if (!regRes.ok || !regJson?.ok) {
        const detail =
          typeof regJson?.detail === "string"
            ? regJson.detail
            : regJson?.detail
            ? JSON.stringify(regJson.detail)
            : "";
        setMsg(`회원가입 실패 (${regRes.status}) ${detail}`.trim());
        return;
      }

      // 2) ✅ 자동 로그인 금지 → 로그인 페이지로 이동 (next 유지)
      setMsg("회원가입 완료. 로그인 페이지로 이동합니다...");
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setMsg("네트워크 오류");
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
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Register</h1>
        <p style={{ color: "#666", marginTop: 8 }}>
          회원가입 완료 후 로그인 페이지로 이동합니다.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              type="email"
              required
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Password (8자 이상 권장)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </label>

          {msg ? (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fafafa",
                fontSize: 13,
              }}
            >
              {msg}
            </div>
          ) : null}

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
            {loading ? "가입 중..." : "회원가입"}
          </button>

          <div style={{ fontSize: 13, opacity: 0.85 }}>
            이미 계정이 있나요?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              style={{ textDecoration: "underline" }}
            >
              로그인
            </Link>
          </div>
        </form>

        <p style={{ marginTop: 14 }}>
          <Link href="/">홈으로</Link>
        </p>
      </div>
    </main>
  );
}
