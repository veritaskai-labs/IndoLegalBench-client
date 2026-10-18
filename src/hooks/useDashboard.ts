"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboard } from "@/lib/dashboardApi";
import type { DashboardSummary } from "@/types/dashboard";

/** AC2: selama halaman terbuka, data tidak boleh lebih lama dari satu menit. */
export const DASHBOARD_POLL_MS = 60_000;

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; summary: DashboardSummary }
  | { status: "error"; message: string };

export type UseDashboard = DashboardState & { reload: () => void };

/** Ringkasan dasbor yang menyegarkan dirinya sendiri. `enabled` false untuk peran tanpa dasbor. */
export function useDashboard(enabled: boolean): UseDashboard {
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  // Sekali angka tampil, penyegaran berikutnya berjalan diam-diam: gagal pun layar tidak dikosongkan.
  const shown = useRef(false);

  const reload = useCallback(() => {
    setState((prev) => (prev.status === "error" ? { status: "loading" } : prev));
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const read = () => {
      getDashboard()
        .then((summary) => {
          if (cancelled) return;
          shown.current = true;
          setState({ status: "ready", summary });
        })
        .catch(() => {
          if (cancelled || shown.current) return;
          setState({ status: "error", message: "Gagal memuat dasbor." });
        });
    };

    read();
    const timer = setInterval(read, DASHBOARD_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, nonce]);

  return { ...state, reload };
}