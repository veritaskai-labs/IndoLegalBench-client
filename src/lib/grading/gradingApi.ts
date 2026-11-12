import { apiFetch } from "@/lib/apiClient";
import type { GradedSessionListItem, GradingRunSummary, SessionGradingResponse } from "@/types/grading";

/**
 * Pintu ke server untuk penilaian sesi (PBI-14). Hook dan komponen bergantung pada interface ini,
 * bukan pada fetch, jadi test-nya memakai gateway palsu, dan implementasi HTTP-nya bisa diganti
 * tanpa menyentuh tampilan. Polanya sama dengan RubricsGateway di SCRUM-228.
 */
/** Pilihan Admin saat menilai (AC6, AC7, K-17/K-18). Yang kosong memakai bawaan server. */
export interface GradeOptions {
  /** Label versi rubrik, mis. "v2". Kosong: versi rubrik aktif. */
  rubricVersion?: string;
  /** LLM judge (produk AI otomatis yang aktif). Kosong: judge sesi. */
  judgeProviderId?: string;
}

export interface GradingGateway {
  /** Tanpa pilihan: versi rubrik aktif dan judge sesi. Nilai ulang mengirim versi dan/atau judge (AC7). */
  grade(sessionId: string, options?: GradeOptions): Promise<SessionGradingResponse>;
  results(sessionId: string): Promise<SessionGradingResponse>;
  /** Riwayat penilaian sesi, terbaru di atas (Admin, AC7). Kosong bila sesi belum pernah dinilai. */
  runs(sessionId: string): Promise<GradingRunSummary[]>;
  /** Satu run lengkap dengan kasusnya, termasuk run lama atau judge lain (Admin, server#134). */
  run(sessionId: string, runId: string): Promise<SessionGradingResponse>;
  sessions(): Promise<GradedSessionListItem[]>;
}

function sessionPath(sessionId: string, action: string): string {
  return `/measurements/${encodeURIComponent(sessionId)}/${action}`;
}

/** Body POST /grade: hanya pilihan yang diisi, tanpa body sama sekali bila tidak ada pilihan. */
export function gradeBody(options: GradeOptions = {}): string | undefined {
  const body = {
    ...(options.rubricVersion === undefined ? {} : { rubric_version: options.rubricVersion }),
    ...(options.judgeProviderId === undefined ? {} : { judge_provider_id: options.judgeProviderId }),
  };
  return Object.keys(body).length === 0 ? undefined : JSON.stringify(body);
}

/**
 * Semuanya silentForbidden: 403 di sini dijelaskan di tempat hasil atau daftar itu tampil, bukan
 * dengan pindah ke /forbidden. Developer AI tetap boleh melihat sisa halaman sesi walau hasil sesi
 * yang masih berjalan hanya untuk Admin (server#114).
 */
export const httpGradingGateway: GradingGateway = {
  /**
   * POST /measurements/{id}/grade (Admin, AC6, AC7). Tanpa pilihan tidak ada body: server memakai
   * versi rubrik aktif dan judge sesi. Nilai ulang menambah run baru; hasil lama tetap tersimpan.
   */
  grade: (sessionId, options) => {
    const body = gradeBody(options);
    return apiFetch<SessionGradingResponse>(sessionPath(sessionId, "grade"), {
      method: "POST",
      ...(body === undefined ? {} : { body }),
      silentForbidden: true,
    });
  },

  /** GET /measurements/{id}/results (AC8): penilaian terbaru, sudah disamarkan server sesuai peran. */
  results: (sessionId) =>
    apiFetch<SessionGradingResponse>(sessionPath(sessionId, "results"), { silentForbidden: true }),

  /** GET /measurements/{id}/grading-runs (Admin, AC7, server#122): semua run sesi sebagai ringkasan tanpa kasus. */
  runs: (sessionId) =>
    apiFetch<GradingRunSummary[]>(sessionPath(sessionId, "grading-runs"), { silentForbidden: true }),

  /** GET /measurements/{id}/grading-runs/{run_id} (Admin, server#134): run lain dari sesi yang sama. */
  run: (sessionId, runId) =>
    apiFetch<SessionGradingResponse>(sessionPath(sessionId, `grading-runs/${encodeURIComponent(runId)}`), {
      silentForbidden: true,
    }),

  /**
   * GET /results/sessions (Admin, Viewer; keputusan PO): sesi selesai yang sudah dinilai, untuk
   * dipilih di Laporan. Server juga punya /measurements/results/sessions dengan isi yang sama; yang
   * dipakai jalur ini, sesuai usulan di review server#114.
   */
  sessions: () => apiFetch<GradedSessionListItem[]>("/results/sessions", { silentForbidden: true }),
};
