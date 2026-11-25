"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { runsErrorMessage } from "@/lib/grading/gradingRules";
import type { SessionGradingResponse } from "@/types/grading";

/**
 * Satu run penilaian yang dibuka dari riwayat (K-17/K-18, server#134). Tanpa runId tidak ada yang
 * diminta dan hasilnya null, jadi pemanggil tetap memakai hasil terbaru. Kunci memuat sesi dan run,
 * jadi berpindah run tidak menampilkan skor run sebelumnya.
 */
export function useGradingRun(sessionId: string, runId: string | null, gateway: GradingGateway = httpGradingGateway) {
  return useAsyncResource<SessionGradingResponse | null>(
    `grading-run|${sessionId}|${runId ?? ""}`,
    () => (runId === null ? Promise.resolve(null) : gateway.run(sessionId, runId)),
    runsErrorMessage,
  );
}
