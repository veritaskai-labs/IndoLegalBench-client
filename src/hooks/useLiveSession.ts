"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSession } from "@/lib/runs/runsApi";
import { isSettled } from "@/lib/runs/sessionRules";
import type { SessionDetail } from "@/types/measurement";

/** PBI-11 AC9: detail sesi diperbarui kira-kira tiap 5 detik, tanpa muat ulang halaman. */
export const SESSION_POLL_MS = 5000;

export type LiveSession = {
  session: SessionDetail;
  /** Refresh terakhir gagal: yang tampil adalah data terakhir yang berhasil dimuat. */
  stale: boolean;
  /** Ambil sesi terbaru sekarang, tanpa spinner (mis. setelah aksi kontrol). */
  reload: () => void;
};

/**
 * Menjaga detail sesi tetap baru selama masih bisa berubah. Sesi yang sudah settled (berakhir atau
 * dibatalkan) tidak di-poll. Polling tidak menumpuk (satu panggilan pada satu waktu), sedangkan reload manual selalu jalan; kalau gagal, data terakhir tetap
 * tampil dan stale menyala sampai panggilan berikutnya berhasil.
 */
export function useLiveSession(initial: SessionDetail): LiveSession {
  const [session, setSession] = useState(initial);
  const [stale, setStale] = useState(false);
  const fetching = useRef(false);
  const sessionId = initial.id;
  const settled = isSettled(session.status);

  const refresh = useCallback((passive: boolean) => {
    fetching.current = true;

    const request = passive ? getSession(sessionId, { activity: "passive" }) : getSession(sessionId);
    request
      .then((updated) => {
        setSession(updated);
        setStale(false);
      })
      .catch(() => {
        setStale(true);
      })
      .finally(() => {
        fetching.current = false;
      });
  }, [sessionId]);

  const reload = useCallback(() => {
    refresh(false);
  }, [refresh]);

  useEffect(() => {
    if (settled) return;
    const timer = setInterval(() => {
      if (!fetching.current) refresh(true);
    }, SESSION_POLL_MS);
    return () => clearInterval(timer);
  }, [settled, refresh]);

  return { session, stale, reload };
}
