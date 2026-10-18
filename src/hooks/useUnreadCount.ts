"use client";

import { useCallback, useEffect, useState } from "react";
import { getUnreadCount } from "@/lib/notifications/notificationApi";

const POLL_MS = 30_000;

/** Jumlah notifikasi belum dibaca: dimuat saat dipasang, lalu tiap 30 detik. */
export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getUnreadCount();
        if (!cancelled) setCount(result.count);
      } catch {
        // Angka terakhir tetap tampil; polling berikutnya mencoba lagi.
      }
    }

    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  return { count, refresh };
}
