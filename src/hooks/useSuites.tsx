"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { Suite, SuitePage, SuiteStatus } from "@/types/suite";

type SuitesState =
  | { status: "loading" }
  | { status: "ready"; suites: Suite[] }
  | { status: "error" };

type UseSuites = SuitesState & {
  suites: Suite[];
  reload: () => void;
};

/** Ambil daftar suite sesuai status, dipakai tab Aktif/Arsip */
export function useSuites(status: SuiteStatus): UseSuites {
  const [state, setState] = useState<SuitesState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    apiFetch<SuitePage>(`/suites?status=${status}`)
      .then((page) => {
        if (cancelled) return;
        setState({ status: "ready", suites: page.items });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [status, nonce]);

  return {
    ...state,
    suites: state.status === "ready" ? state.suites : [],
    reload,
  };
}