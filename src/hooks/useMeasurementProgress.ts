"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/apiClient";
import { getProgress } from "@/lib/runs/runsApi";
import type { MeasurementProgress } from "@/types/measurement";

/** AC6: diperbarui otomatis kira-kira tiap 5 detik, tanpa muat ulang halaman. */
export const PROGRESS_POLL_MS = 5000;

export type ProgressResource =
  | { status: "loading" }
  | { status: "ready"; data: MeasurementProgress }
  | { status: "error"; message: string };

/** 404 dibedakan: sesinya tidak ada, jadi menunggu polling berikutnya tidak akan menolong. */
function toMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "MEASUREMENT_NOT_FOUND") return "Sesi tidak ditemukan.";
  return "Gagal memuat progres pengukuran. Coba lagi.";
}

/**
 * Angka progres satu sesi, diperbarui sendiri selama halaman terbuka (AC5, AC6).
 *
 * Tidak memakai useAsyncResource: reload di sana mengubah kunci, dan tampilan kembali ke
 * loading sampai balasan datang. Di panel yang di-poll tiap 5 detik itu berarti berkedip
 * terus, padahal AC-nya justru tanpa muat ulang. Jadi angka terakhir ditahan tetap tampil
 * selama panggilan berikutnya berjalan, dan satu kali gagal di tengah pengukuran tidak
 * mengosongkan panel: "terakhir diperbarui" yang memberi tahu bahwa angkanya sudah tua.
 *
 * Loading diturunkan dari kunci, mengikuti useAsyncResource: selama hasil tersimpan bukan
 * milik sesi ini, tampilan menunggu, jadi berpindah sesi tidak menampilkan angka sesi lain.
 *
 * poll false untuk sesi yang sudah berakhir: angkanya tidak akan berubah lagi.
 */
export function useMeasurementProgress(sessionId: string, options: { poll: boolean }): ProgressResource {
  const [settled, setSettled] = useState<{ key: string; state: ProgressResource } | null>(null);
  const alive = useRef(true);
  const withNumbers = useRef<string | null>(null);

  const read = useCallback(() => {
    getProgress(sessionId)
      .then((data) => {
        if (!alive.current) return;
        withNumbers.current = sessionId;
        setSettled({ key: sessionId, state: { status: "ready", data } });
      })
      .catch((error: unknown) => {
        if (!alive.current || withNumbers.current === sessionId) return;
        setSettled({ key: sessionId, state: { status: "error", message: toMessage(error) } });
      });
  }, [sessionId]);

  useEffect(() => {
    alive.current = true;
    read();
    return () => {
      alive.current = false;
    };
  }, [read]);

  useEffect(() => {
    if (!options.poll) return;
    const timer = setInterval(read, PROGRESS_POLL_MS);
    return () => clearInterval(timer);
  }, [options.poll, read]);



  return settled?.key === sessionId ? settled.state : { status: "loading" };
}