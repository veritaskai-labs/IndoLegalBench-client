"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { MOCK_ENABLED, mockMe } from "@/lib/mockAuth";
import type { Me } from "@/types";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: Me }
  | { status: "unauthenticated"; reason: "no_session" | "expired" };

const AuthContext = createContext<AuthState>({ status: "loading" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    MOCK_ENABLED
      ? { status: "authenticated", user: mockMe }
      : { status: "loading" },
  );

  useEffect(() => {
    if (MOCK_ENABLED) return;

    let cancelled = false;

    apiFetch<Me>("/me")
      .then((user) => {
        if (cancelled) return;
        sessionStorage.setItem("ilb:had-session", "1");
        setState({ status: "authenticated", user });
      })
      .catch((error) => {
        if (cancelled) return;
        /** Sesi habis & belum login dua-duanya 401, sementara dibedakan lokal */
        const hadSession = sessionStorage.getItem("ilb:had-session") === "1";
        sessionStorage.removeItem("ilb:had-session");
        const expired =
          error instanceof ApiError && error.status === 401 && hadSession;
        setState({
          status: "unauthenticated",
          reason: expired ? "expired" : "no_session",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}