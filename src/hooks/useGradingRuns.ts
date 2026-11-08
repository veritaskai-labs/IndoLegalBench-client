"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { runsErrorMessage } from "@/lib/grading/gradingRules";
import type { GradingRunSummary } from "@/types/grading";

/**
 * Riwayat penilaian satu sesi (PBI-14 AC7), terbaru di atas. Kunci memuat id sesi, jadi berpindah
 * sesi tidak menampilkan riwayat sesi sebelumnya. Daftar kosong berarti sesi belum pernah dinilai,
 * bukan kesalahan. Gateway masuk sebagai parameter, jadi test dan komponen tidak terikat ke fetch.
 */
export function useGradingRuns(sessionId: string, gateway: GradingGateway = httpGradingGateway) {
  return useAsyncResource<GradingRunSummary[]>(
    `grading-runs|${sessionId}`,
    () => gateway.runs(sessionId),
    runsErrorMessage,
  );
}
