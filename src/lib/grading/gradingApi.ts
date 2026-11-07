import { apiFetch } from "@/lib/apiClient";
import type { GradedSessionListItem, GradingRunSummary, SessionGradingResponse } from "@/types/grading";

/**
 * Pintu ke server untuk penilaian sesi (PBI-14). Hook dan komponen bergantung pada interface ini,
 * bukan pada fetch, jadi test-nya memakai gateway palsu, dan implementasi HTTP-nya bisa diganti
 * tanpa menyentuh tampilan. Polanya sama dengan RubricsGateway di SCRUM-228.
 */
export interface GradingGateway {
  /** Tanpa versi: versi rubrik aktif. Dengan versi (mis. "v2"): nilai ulang dengan versi itu (AC7). */
  grade(sessionId: string, rubricVersion?: string): Promise<SessionGradingResponse>;
  results(sessionId: string): Promise<SessionGradingResponse>;
  /** Riwayat penilaian sesi, terbaru di atas (Admin, AC7). Kosong bila sesi belum pernah dinilai. */
  runs(sessionId: string): Promise<GradingRunSummary[]>;
  sessions(): Promise<GradedSessionListItem[]>;
}

function sessionPath(sessionId: string, action: string): string {
  return `/measurements/${encodeURIComponent(sessionId)}/${action}`;
}

/**
 * Semuanya silentForbidden: 403 di sini dijelaskan di tempat hasil atau daftar itu tampil, bukan
 * dengan pindah ke /forbidden. Developer AI tetap boleh melihat sisa halaman sesi walau hasil sesi
 * yang masih berjalan hanya untuk Admin (server#114).
 */
export const httpGradingGateway: GradingGateway = {
  /**
   * POST /measurements/{id}/grade (Admin, AC6, AC7). Tanpa versi tidak ada body: server memakai
   * versi rubrik aktif. Dengan versi, body { rubric_version }: hasil lama tetap tersimpan.
   */
  grade: (sessionId, rubricVersion) =>
    apiFetch<SessionGradingResponse>(sessionPath(sessionId, "grade"), {
      method: "POST",
      ...(rubricVersion === undefined ? {} : { body: JSON.stringify({ rubric_version: rubricVersion }) }),
      silentForbidden: true,
    }),

  /** GET /measurements/{id}/results (AC8): penilaian terbaru, sudah disamarkan server sesuai peran. */
  results: (sessionId) =>
    apiFetch<SessionGradingResponse>(sessionPath(sessionId, "results"), { silentForbidden: true }),

  /** GET /measurements/{id}/grading-runs (Admin, AC7, server#122): semua run sesi sebagai ringkasan tanpa kasus. */
  runs: (sessionId) =>
    apiFetch<GradingRunSummary[]>(sessionPath(sessionId, "grading-runs"), { silentForbidden: true }),

  /**
   * GET /results/sessions (Admin, Viewer; keputusan PO): sesi selesai yang sudah dinilai, untuk
   * dipilih di Laporan. Server juga punya /measurements/results/sessions dengan isi yang sama; yang
   * dipakai jalur ini, sesuai usulan di review server#114.
   */
  sessions: () => apiFetch<GradedSessionListItem[]>("/results/sessions", { silentForbidden: true }),
};
