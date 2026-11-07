"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { isNotGraded, resultsErrorMessage } from "@/lib/grading/gradingRules";
import type { SessionGradingResponse } from "@/types/grading";

/**
 * Penilaian terbaru satu sesi (PBI-14 AC8). data null berarti sesi belum pernah dinilai: server
 * menjawab 404 GRADING_NOT_FOUND, yang di sini diubah menjadi hasil kosong, bukan kesalahan.
 * Gateway masuk sebagai parameter, jadi test dan komponen tidak terikat ke fetch.
 */
export function useSessionResults(sessionId: string, gateway: GradingGateway = httpGradingGateway) {
  return useAsyncResource<SessionGradingResponse | null>(
    `session-results|${sessionId}`,
    () =>
      gateway.results(sessionId).catch((error: unknown) => {
        if (isNotGraded(error)) return null;
        throw error;
      }),
    resultsErrorMessage,
  );
}
