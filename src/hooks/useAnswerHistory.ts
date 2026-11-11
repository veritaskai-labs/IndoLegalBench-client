"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { answerErrorMessage, type ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";

const HISTORY_FALLBACK = "Gagal memuat riwayat jawaban. Coba lagi.";

const toMessage = (error: unknown) => answerErrorMessage(error, HISTORY_FALLBACK);

/** Versi lama satu jawaban, terlama dulu; semua yang bisa membuka sesi boleh melihatnya (AC5). */
export function useAnswerHistory(
  gateway: ManualAnswerGateway,
  sessionId: string,
  snapshotItemId: string,
  attemptNo: number,
) {
  return useAsyncResource<ManualAnswerHistoryEntry[]>(
    `answer-history|${sessionId}|${snapshotItemId}|${attemptNo}`,
    () => gateway.getHistory(sessionId, snapshotItemId, attemptNo),
    toMessage,
  );
}
