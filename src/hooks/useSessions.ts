"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { listSessions } from "@/lib/runs/runsApi";
import type { SessionListItem } from "@/types/measurement";

/** Daftar sesi di halaman Eksekusi (PBI-11 AC10). 403 sudah dialihkan ke /forbidden oleh apiFetch. */
export function useSessions() {
  return useAsyncResource<SessionListItem[]>(
    "measurement-sessions",
    listSessions,
    () => "Gagal memuat sesi pengukuran. Coba lagi.",
  );
}
