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

    // The first read, and Reload, are the user opening the page. The interval
    // and the visibility refetch are polls and must not extend the session.
    const read = (passive: boolean) => {
      // Tab yang tersembunyi tidak dilihat siapa pun; penyegarannya ditunda
      // sampai kembali terlihat, lalu dibaca ulang saat itu juga.
      if (document.visibilityState === "hidden") return;

      const load = passive ? getDashboard({ activity: "passive" }) : getDashboard();
      load
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

    read(false);
    const timer = setInterval(() => read(true), DASHBOARD_POLL_MS);
    const onVisible = () => read(true);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, nonce]);

  return { ...state, reload };
}