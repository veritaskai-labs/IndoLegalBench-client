"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AsyncResource } from "@/hooks/useAsyncResource";

type Settled<T> = { key: string; state: AsyncResource<T> };

/**
 * Data yang dimuat sekali lalu ditanya ulang tiap intervalMs selama shouldPoll bilang perlu
 * (PBI-12 AC6: panel progres dan kolom progres daftar sesi).
 *
 * Bedanya dengan useAsyncResource: reload dan polling tidak kembali ke loading. Data terakhir tetap
 * tampil selama panggilan berikutnya berjalan, dan sekali gagal setelah ada data tidak mengosongkan
 * layar: tampilan polling yang berkedip ke skeleton tiap 5 detik justru melanggar "tanpa muat ulang".
 * Loading tetap diturunkan dari requestKey, jadi berpindah kunci tidak pernah menampilkan data
 * milik kunci lain, dan balasan yang terlambat untuk kunci lama dibuang.
 *
 * shouldPoll menerima data terakhir (null selama loading atau error), jadi pemanggil bisa
 * berhenti polling dari isi datanya. load, toMessage, dan shouldPoll boleh fungsi baru tiap render.
 * load(false) is the first read and Reload. load(true) is the interval and must not extend the session.
 */
export function usePolledResource<T>({
  requestKey,
  load,
  toMessage,
  shouldPoll,
  intervalMs,
}: Readonly<{
  requestKey: string;
  load: (passive: boolean) => Promise<T>;
  toMessage: (error: unknown) => string;
  shouldPoll: (data: T | null) => boolean;
  intervalMs: number;
}>): AsyncResource<T> & { reload: () => void } {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const latest = useRef({ load, toMessage });
  const current = useRef(requestKey);
  const withData = useRef<string | null>(null);

  useEffect(() => {
    latest.current = { load, toMessage };
  });

  const read = useCallback((passive: boolean) => {
    latest.current
      .load(passive)
      .then((data) => {
        if (current.current !== requestKey) return;
        withData.current = requestKey;
        setSettled({ key: requestKey, state: { status: "ready", data } });
      })
      .catch((error: unknown) => {
        if (current.current !== requestKey || withData.current === requestKey) return;
        setSettled({ key: requestKey, state: { status: "error", message: latest.current.toMessage(error) } });
      });
  }, [requestKey]);

  useEffect(() => {
    current.current = requestKey;
    read(false);
    return () => {
      current.current = "";
    };
  }, [requestKey, read]);

  const state: AsyncResource<T> = settled?.key === requestKey ? settled.state : { status: "loading" };
  const poll = shouldPoll(state.status === "ready" ? state.data : null);

  useEffect(() => {
    if (!poll) return;
    const timer = setInterval(() => read(true), intervalMs);
    return () => clearInterval(timer);
  }, [poll, read, intervalMs]);

  return { ...state, reload: () => read(false) };
}
