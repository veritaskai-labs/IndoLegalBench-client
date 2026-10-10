"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Satu aksi sekali jalan yang dipicu tombol: menandai pending, menyimpan pesan error,
 * dan menolak klik kedua selama yang pertama belum selesai. Hasilnya diserahkan ke onDone.
 * Dipakai bersama oleh aksi yang bentuknya sama, supaya tiap fitur tidak menyalin logika ini.
 */
export function useAsyncAction<T>(
  action: () => Promise<T>,
  onDone: (result: T) => void,
  toMessage: (error: unknown) => string,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref, bukan state: klik kedua bisa masuk sebelum render ulang menonaktifkan tombol.
  const inFlight = useRef(false);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    let outcome: { value: T } | null = null;
    try {
      outcome = { value: await action() };
    } catch (failure) {
      setError(toMessage(failure));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
    // Di luar try: galat di onDone bukan kegagalan permintaan. Kalau dilaporkan sebagai gagal,
    // pengguna menekan lagi padahal hasilnya sudah terbentuk di server.
    if (outcome !== null) onDone(outcome.value);
  }, [action, onDone, toMessage]);

  return { run, pending, error };
}
