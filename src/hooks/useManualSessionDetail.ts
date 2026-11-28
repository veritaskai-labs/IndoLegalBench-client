"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { getManualSession } from "@/lib/runs/manualRunsApi";
import type { ManualSessionDetail } from "@/types/measurement";

const COPY = messages({
  id: {
    missing: "Sesi pengukuran manual tidak ditemukan.",
    failed: "Gagal memuat sesi pengukuran manual. Coba lagi.",
  },
  en: {
    missing: "Manual measurement session not found.",
    failed: "Could not load the manual measurement session. Try again.",
  },
});

/**
 * Detail satu sesi pengukuran manual (PBI-22 AC3, AC4, AC8, AC11-AC13).
 * unfilled=true hanya menampilkan kasus yang belum selesai diisi.
 */
export function useManualSessionDetail(sessionId: string, unfilled = false) {
  const copy = useText(COPY);
  return useAsyncResource<ManualSessionDetail>(
    `manual-session|${sessionId}|unfilled:${unfilled}`,
    () => getManualSession(sessionId, unfilled),
    (error) => (error instanceof ApiError && error.code === "MANUAL_SESSION_NOT_FOUND" ? copy.missing : copy.failed),
  );
}
