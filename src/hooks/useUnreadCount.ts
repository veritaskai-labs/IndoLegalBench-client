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
      // Tab tersembunyi tidak dilihat; dibaca ulang begitu terlihat lagi.
      if (document.visibilityState === "hidden") return;
      try {
        const result = await getUnreadCount();
        if (!cancelled) setCount(result.count);
      } catch {
        // Angka terakhir tetap tampil; polling berikutnya mencoba lagi.
      }
    }

    const readNow = () => void load();
    readNow();
    const timer = setInterval(readNow, POLL_MS);
    document.addEventListener("visibilitychange", readNow);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", readNow);
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  return { count, refresh };
}
