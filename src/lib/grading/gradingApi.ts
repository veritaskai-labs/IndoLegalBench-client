import { apiFetch } from "@/lib/apiClient";
import type { SessionGradingResponse } from "@/types/grading";

/**
 * Pintu ke server untuk penilaian sesi (PBI-14). Hook dan komponen bergantung pada interface ini,
 * bukan pada fetch, jadi test-nya memakai gateway palsu, dan implementasi HTTP-nya bisa diganti
 * tanpa menyentuh tampilan. Polanya sama dengan RubricsGateway di SCRUM-228.
 */
export interface GradingGateway {
  grade(sessionId: string): Promise<SessionGradingResponse>;
  results(sessionId: string): Promise<SessionGradingResponse>;
}

function sessionPath(sessionId: string, action: string): string {
  return `/measurements/${encodeURIComponent(sessionId)}/${action}`;
}

/**
 * Keduanya silentForbidden: 403 di sini dijelaskan di bagian hasil penilaian, bukan dengan pindah ke
 * /forbidden. Developer AI tetap boleh melihat sisa halaman sesi walau hasil sesi yang masih berjalan
 * hanya untuk Admin (server#114).
 */
export const httpGradingGateway: GradingGateway = {
  /** POST /measurements/{id}/grade (Admin, AC6). Tanpa body: server memakai versi rubrik aktif. */
  grade: (sessionId) =>
    apiFetch<SessionGradingResponse>(sessionPath(sessionId, "grade"), { method: "POST", silentForbidden: true }),

  /** GET /measurements/{id}/results (AC8): penilaian terbaru, sudah disamarkan server sesuai peran. */
  results: (sessionId) =>
    apiFetch<SessionGradingResponse>(sessionPath(sessionId, "results"), { silentForbidden: true }),
};
