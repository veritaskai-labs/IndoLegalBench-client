"use client";

import { usePolledResource } from "@/hooks/usePolledResource";
import { listSessions } from "@/lib/runs/runsApi";
import { isManualStatus, shouldPollSessions } from "@/lib/runs/sessionRules";

/** AC6: kolom progres daftar diperbarui kira-kira tiap 5 detik, sama dengan panel progres. */
export const SESSIONS_POLL_MS = 5000;

/**
 * Daftar sesi di halaman Eksekusi (PBI-11 AC10): daftar utama, atau daftar arsip bila archived true.
 * Kunci berbeda per daftar, jadi balasan satu daftar tidak pernah tampil di daftar lainnya.
 * 403 sudah dialihkan ke /forbidden oleh apiFetch.
 *
 * Hanya menampilkan sesi pengukuran otomatis (bukan sesi manual dari PBI-22).
 * Daftar utama ditanya ulang tiap 5 detik selama ada sesi yang antre atau berjalan (SCRUM-266),
 * tanpa berkedip ke skeleton. Daftar arsip tidak di-poll: semua sesinya sudah berakhir.
 */
export function useSessions(archived = false) {
  return usePolledResource({
    requestKey: archived ? "measurement-sessions-archived" : "measurement-sessions",
    load: async () => {
      const items = await listSessions(archived);
      return items.filter((item) => !isManualStatus(item.status));
    },
    toMessage: () => "Gagal memuat sesi pengukuran. Coba lagi.",
    shouldPoll: (sessions) => !archived && sessions !== null && shouldPollSessions(sessions),
    intervalMs: SESSIONS_POLL_MS,
  });
}
