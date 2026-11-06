import { apiFetch } from "@/lib/apiClient";
import type { CreateRubricVersionRequest, GradingRun, RegradeRequest, RubricVersion } from "@/types/rubric";

/**
 * Pintu ke server untuk rubrik dan nilai ulang (PBI-14 AC7). Hook bergantung pada interface ini,
 * bukan pada fetch, jadi test hook memakai gateway palsu dan implementasi HTTP-nya bisa diganti
 * tanpa menyentuh hook atau komponen.
 */
export interface RubricsGateway {
  listVersions(): Promise<RubricVersion[]>;
  createVersion(request: CreateRubricVersionRequest): Promise<RubricVersion>;
  regrade(sessionId: string, request: RegradeRequest): Promise<GradingRun>;
  listGradingRuns(sessionId: string): Promise<GradingRun[]>;
}

function sessionPath(sessionId: string, action: string): string {
  return `/measurements/${encodeURIComponent(sessionId)}/${action}`;
}

/**
 * Aksi memakai silentForbidden: 403 berarti peran berubah saat form atau dialog terbuka, dan
 * yang menjelaskan adalah form atau dialognya, bukan pengalihan ke /forbidden. Daftar rubrik
 * tidak: halamannya khusus Admin, jadi 403 di sana memang urusan /forbidden.
 */
export const httpRubricsGateway: RubricsGateway = {
  /** GET /rubrics (Admin): semua versi. Daftar kosong sebelum v1 diketik. */
  listVersions: () => apiFetch<RubricVersion[]>("/rubrics"),

  /** POST /rubrics (Admin): versi baru. Versi lama tidak pernah diubah. 422 membawa field yang ditolak. */
  createVersion: (request) =>
    apiFetch<RubricVersion>("/rubrics", { method: "POST", body: JSON.stringify(request), silentForbidden: true }),

  /** POST /measurements/{id}/grade (Admin): nilai ulang dengan versi yang dipilih; hasil lama tetap tersimpan. */
  regrade: (sessionId, request) =>
    apiFetch<GradingRun>(sessionPath(sessionId, "grade"), {
      method: "POST",
      body: JSON.stringify(request),
      silentForbidden: true,
    }),

  /** GET /measurements/{id}/grading-runs: riwayat penilaian sesi, run terbaru ditandai is_latest. */
  listGradingRuns: (sessionId) =>
    apiFetch<GradingRun[]>(sessionPath(sessionId, "grading-runs"), { silentForbidden: true }),
};
