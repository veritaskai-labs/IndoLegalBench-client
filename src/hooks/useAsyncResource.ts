"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Settled<T> = { key: string; state: { status: "ready"; data: T } | { status: "error"; message: string } };

export type AsyncResource<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

/**
 * Memuat satu data saat tampil, dengan loading, error, dan muat ulang. Data diidentifikasi oleh
 * requestKey (misalnya id dan halaman). Status loading diturunkan dari kunci itu: selama hasil
 * yang tersimpan bukan milik kunci saat ini, tampilan menunggu, jadi berpindah kunci atau memuat
 * ulang tidak menampilkan data milik kunci lain, dan balasan yang terlambat dibuang.
 * load dan toMessage dibaca lewat ref, jadi pemanggil tidak perlu membungkusnya dengan useCallback.
 */
export function useAsyncResource<T>(
  requestKey: string,
  load: () => Promise<T>,
  toMessage: (error: unknown) => string,
): AsyncResource<T> & { reload: () => void } {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const latest = useRef({ load, toMessage });
  const key = `${requestKey}|${nonce}`;

  useEffect(() => {
    latest.current = { load, toMessage };
  });

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    latest.current
      .load()
      .then((data) => {
        if (!cancelled) setSettled({ key, state: { status: "ready", data } });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSettled({ key, state: { status: "error", message: latest.current.toMessage(error) } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const state: AsyncResource<T> = settled?.key === key ? settled.state : { status: "loading" };
  return { ...state, reload };
}
