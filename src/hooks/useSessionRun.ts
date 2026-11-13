"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { runResultsErrorMessage } from "@/lib/grading/gradingRules";
import type { SessionGradingResponse } from "@/types/grading";

/**
 * Satu grading run yang dibuka dari baris Laporan (PBI-22 AC9), bukan selalu yang terbaru. Berbeda
 * dengan useSessionResults, run yang tidak ada adalah kesalahan (404), bukan "belum dinilai". Server
 * menyamarkan soal dan jawaban mentah untuk Viewer dan Kontributor (server#141).
 * Gateway masuk sebagai parameter, jadi test dan komponen tidak terikat ke fetch.
 */
export function useSessionRun(sessionId: string, runId: string, gateway: GradingGateway = httpGradingGateway) {
  return useAsyncResource<SessionGradingResponse>(
    `session-run|${sessionId}|${runId}`,
    () => gateway.run(sessionId, runId),
    runResultsErrorMessage,
  );
}
