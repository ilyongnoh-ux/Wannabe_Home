"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type MePayload = Record<string, any>;

type AuthState =
  | { status: "loading"; authenticated: false; me: null; reason?: string }
  | { status: "ready"; authenticated: false; me: null; reason?: string }
  | { status: "ready"; authenticated: true; me: MePayload; reason?: string };

type AuthContextValue = {
  state: AuthState;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<{ authenticated: boolean; me?: any; reason?: string }> {
  const res = await fetch("/api/me", {
    method: "GET",
    cache: "no-store",
    // same-origin이면 기본적으로 쿠키가 자동 포함되지만,
    // 명시해두면 브라우저/환경에 따라 더 안전하다.
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  // /api/me는 200으로 정규화해서 내려주고 있으니 json만 보면 됨
  return res.json();
}

async function callLogout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    authenticated: false,
    me: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const data = await fetchMe();
      if (data.authenticated) {
        setState({ status: "ready", authenticated: true, me: data.me ?? {}, reason: data.reason });
      } else {
        setState({ status: "ready", authenticated: false, me: null, reason: data.reason });
      }
    } catch {
      // 네트워크/서버 이슈: 로그인으로 단정하지 말고, 상태만 "비인증"으로 둔다
      setState({ status: "ready", authenticated: false, me: null, reason: "client_fetch_failed" });
    }
  }, []);

  const logout = useCallback(async () => {
    await callLogout();
    // 로그아웃 후 상태 정리
    setState({ status: "ready", authenticated: false, me: null, reason: "logout" });
  }, []);

  useEffect(() => {
    // 최초 진입 시 1회 인증 확인
    refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({ state, refresh, logout }), [state, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
