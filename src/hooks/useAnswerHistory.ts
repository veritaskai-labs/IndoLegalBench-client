"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { answerErrorMessage, type ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";

const COPY = messages({
  id: "Gagal memuat riwayat jawaban. Coba lagi.",
  en: "Could not load the answer history. Try again.",
});

/** Versi lama satu jawaban, terlama dulu; semua yang bisa membuka sesi boleh melihatnya (AC5). */
export function useAnswerHistory(
  gateway: ManualAnswerGateway,
  sessionId: string,
  snapshotItemId: string,
  attemptNo: number,
) {
  const fallback = useText(COPY);
  const locale = useLocale();
  return useAsyncResource<ManualAnswerHistoryEntry[]>(
    `answer-history|${sessionId}|${snapshotItemId}|${attemptNo}`,
    () => gateway.getHistory(sessionId, snapshotItemId, attemptNo),
    (error) => answerErrorMessage(error, fallback, locale),
  );
}
