"use client";

import type { RubricsGateway } from "@/lib/rubrics/rubricsApi";
import { httpRubricsGateway } from "@/lib/rubrics/rubricsApi";
import { useAsyncResource } from "./useAsyncResource";

const HISTORY_FAILED = "Gagal memuat riwayat penilaian. Coba lagi.";

/**
 * Riwayat penilaian satu sesi (PBI-14 AC7). Kunci memuat id sesi, jadi berpindah sesi tidak
 * menampilkan riwayat sesi sebelumnya. Hasil lama tetap ada di riwayat setelah nilai ulang.
 */
export function useGradingRuns(sessionId: string, gateway: RubricsGateway = httpRubricsGateway) {
  return useAsyncResource(
    `grading-runs|${sessionId}`,
    () => gateway.listGradingRuns(sessionId),
    () => HISTORY_FAILED,
  );
}
