
"use client";

import { usePolledResource } from "@/hooks/usePolledResource";
import { ApiError } from "@/lib/apiClient";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { getProgress } from "@/lib/runs/runsApi";
import type { MeasurementProgress } from "@/types/measurement";

const COPY = messages({
  id: { missing: "Sesi tidak ditemukan.", failed: "Gagal memuat progres pengukuran. Coba lagi." },
  en: { missing: "Session not found.", failed: "Could not load the measurement progress. Try again." },
});

/** AC6: diperbarui otomatis kira-kira tiap 5 detik, tanpa muat ulang halaman. */
export const PROGRESS_POLL_MS = 5000;

export type ProgressResource =
  | { status: "loading" }
  | { status: "ready"; data: MeasurementProgress }
  | { status: "error"; message: string };

/**
 * Angka progres satu sesi, diperbarui sendiri selama halaman terbuka (AC5, AC6).
 *
 * Polling tanpa kedip ada di usePolledResource (dipakai juga daftar sesi, SCRUM-266): angka
 * terakhir tetap tampil selama panggilan berikutnya berjalan, dan satu kali gagal di tengah
 * pengukuran tidak mengosongkan panel: "terakhir diperbarui" yang memberi tahu bahwa angkanya sudah tua.
 *
 * poll false untuk sesi yang sudah berakhir: angkanya tidak akan berubah lagi. Selama poll true,
 * panggilan diulang juga saat masih error, jadi gangguan sesaat di awal pulih sendiri.
 * 404 dibedakan: sesinya tidak ada, jadi menunggu polling berikutnya tidak akan menolong.
 */
export function useMeasurementProgress(sessionId: string, options: { poll: boolean }): ProgressResource & { reload: () => void } {
  const copy = useText(COPY);
  return usePolledResource({
    requestKey: sessionId,
    load: (passive) =>
      passive ? getProgress(sessionId, { activity: "passive" }) : getProgress(sessionId),
    toMessage: (error) =>
      error instanceof ApiError && error.code === "MEASUREMENT_NOT_FOUND" ? copy.missing : copy.failed,
    shouldPoll: () => options.poll,
    intervalMs: PROGRESS_POLL_MS,
  });
}
