"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { listSessions } from "@/lib/runs/runsApi";
import type { SessionListItem } from "@/types/measurement";

/**
 * Daftar sesi di halaman Eksekusi (PBI-11 AC10): daftar utama, atau daftar arsip bila archived true.
 * Kunci berbeda per daftar, jadi balasan satu daftar tidak pernah tampil di daftar lainnya.
 * 403 sudah dialihkan ke /forbidden oleh apiFetch.
 */
export function useSessions(archived = false) {
  return useAsyncResource<SessionListItem[]>(
    archived ? "measurement-sessions-archived" : "measurement-sessions",
    () => listSessions(archived),
    () => "Gagal memuat sesi pengukuran. Coba lagi.",
  );
}
