"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { listManualSessions } from "@/lib/runs/manualRunsApi";
import type { SessionListItem } from "@/types/measurement";

/**
 * Daftar sesi pengukuran manual (PBI-22 AC8, AC11).
 * Dapat diakses oleh Admin dan Kontributor, termasuk sesi milik orang lain.
 */
export function useManualSessions() {
  return useAsyncResource<SessionListItem[]>(
    "manual-measurement-sessions",
    () => listManualSessions(),
    () => "Gagal memuat sesi pengukuran manual. Coba lagi.",
  );
}
