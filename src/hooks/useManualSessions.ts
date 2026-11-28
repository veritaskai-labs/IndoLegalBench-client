"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { listManualSessions } from "@/lib/runs/manualRunsApi";
import type { SessionListItem } from "@/types/measurement";

const COPY = messages({
  id: "Gagal memuat sesi pengukuran manual. Coba lagi.",
  en: "Could not load the manual measurement sessions. Try again.",
});

/**
 * Daftar sesi pengukuran manual (PBI-22 AC8, AC11).
 * Dapat diakses oleh Admin dan Kontributor, termasuk sesi milik orang lain.
 */
export function useManualSessions() {
  const message = useText(COPY);
  return useAsyncResource<SessionListItem[]>(
    "manual-measurement-sessions",
    () => listManualSessions(),
    () => message,
  );
}
