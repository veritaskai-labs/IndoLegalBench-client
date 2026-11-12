"use client";

import { type AsyncResource, useAsyncResource } from "@/hooks/useAsyncResource";
import { type JudgeOptionsApi, useJudgeOptions } from "@/hooks/useJudgeOptions";
import { type EstimateView, toEstimateView } from "@/lib/grading/gradeEstimate";
import { httpGradingGateway, type GradeOptions, type GradingGateway } from "@/lib/grading/gradingApi";
import { estimateErrorMessage } from "@/lib/grading/gradingRules";

/**
 * Perkiraan biaya penilaian untuk dialog Nilai (PBI-14 AC6). Kunci memuat sesi, judge, dan versi
 * rubrik, jadi mengganti salah satunya memuat ulang dan tidak menampilkan perkiraan pilihan
 * sebelumnya; balasan terlambat dibuang oleh useAsyncResource. options null berarti belum ada pilihan
 * (Nilai ulang sebelum judge dipilih): tidak ada permintaan, hasilnya ready dengan data null. Daftar
 * judge hanya untuk nama, jadi gagal memuatnya tidak menghalangi perkiraan tampil.
 */
export function useGradeEstimate(
  sessionId: string,
  options: GradeOptions | null,
  gateway: GradingGateway = httpGradingGateway,
  judgeApi?: JudgeOptionsApi,
): AsyncResource<EstimateView | null> & { reload: () => void } {
  const judges = useJudgeOptions(judgeApi);
  const key = options === null ? "none" : `${options.judgeProviderId ?? ""}|${options.rubricVersion ?? ""}`;
  const estimate = useAsyncResource(
    `grade-estimate|${sessionId}|${key}`,
    () => (options === null ? Promise.resolve(null) : gateway.estimate(sessionId, options)),
    estimateErrorMessage,
  );

  if (estimate.status !== "ready") return estimate;
  const names = judges.status === "ready" ? judges.options : [];
  return {
    status: "ready",
    data: estimate.data === null ? null : toEstimateView(estimate.data, names),
    reload: estimate.reload,
  };
}
