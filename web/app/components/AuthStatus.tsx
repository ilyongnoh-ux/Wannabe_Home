"use client";

import React from "react";
import { useAuth } from "../providers/AuthProvider";

export default function AuthStatus() {
  const { state, refresh, logout } = useAuth();

  if (state.status === "loading") {
    return (
      <div style={{ padding: 12 }}>
        <b>Auth</b>: 확인 중...
      </div>
    );
  }

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <b>Auth</b>: {state.authenticated ? "✅ 로그인됨" : "❌ 비로그인"}{" "}
        {state.reason ? <span style={{ color: "#666" }}>({state.reason})</span> : null}
      </div>

      {state.authenticated ? (
        <pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.me, null, 2)}
        </pre>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={refresh}>상태 새로고침</button>
        <button onClick={logout}>로그아웃</button>
      </div>
    </div>
  );
}
