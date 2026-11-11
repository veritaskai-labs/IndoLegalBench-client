"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { getManualSession } from "@/lib/runs/manualRunsApi";
import type { ManualSessionDetail } from "@/types/measurement";

function toMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "MANUAL_SESSION_NOT_FOUND") {
    return "Sesi pengukuran manual tidak ditemukan.";
  }
  return "Gagal memuat sesi pengukuran manual. Coba lagi.";
}

/**
 * Detail satu sesi pengukuran manual (PBI-22 AC3, AC4, AC8, AC11-AC13).
 * unfilled=true hanya menampilkan kasus yang belum selesai diisi.
 */
export function useManualSessionDetail(sessionId: string, unfilled = false) {
  return useAsyncResource<ManualSessionDetail>(
    `manual-session|${sessionId}|unfilled:${unfilled}`,
    () => getManualSession(sessionId, unfilled),
    toMessage,
  );
}
