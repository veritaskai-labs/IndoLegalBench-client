"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { getSession } from "@/lib/runs/runsApi";
import type { SessionDetail } from "@/types/measurement";

const COPY = messages({
  id: { missing: "Sesi tidak ditemukan.", failed: "Gagal memuat sesi pengukuran. Coba lagi." },
  en: { missing: "Session not found.", failed: "Could not load the measurement session. Try again." },
});

/** Detail satu sesi (PBI-11 AC7, AC8). 403 sudah dialihkan ke /forbidden oleh apiFetch. 404 dibedakan: ID salah atau sesi tidak ada, jadi Coba lagi tidak akan menolong. */
export function useSessionDetail(sessionId: string) {
  const copy = useText(COPY);
  return useAsyncResource<SessionDetail>(
    `measurement-session|${sessionId}`,
    () => getSession(sessionId),
    (error) => (error instanceof ApiError && error.code === "MEASUREMENT_NOT_FOUND" ? copy.missing : copy.failed),
  );
}
