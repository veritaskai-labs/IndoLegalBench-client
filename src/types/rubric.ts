import type { components } from "@/lib/generated/api";

/** Satu baris GET /admin/rubrics (SCRUM-222): tanpa prompt penilai, aspek, dan level. */
export type RubricVersionSummary = components["schemas"]["RubricVersionSummary"];

/**
 * Draf kontrak rubrik berversi dan nilai ulang (PBI-14, SCRUM-228).
 *
 * Ditulis tangan dari model server #111 (SCRUM-222) karena GET/POST /rubrics, POST
 * /measurements/{id}/grade dan GET /measurements/{id}/grading-runs belum ada di contract/openapi.json.
 * Begitu kontraknya merge, jalankan npm run gen:api dan ganti isi file ini dengan
 * components["schemas"][...] seperti types/measurement.ts. Bentuk bidangnya sengaja mengikuti nama
 * kolom server (snake_case) supaya penggantian itu tidak mengubah pemakainya.
 */

/** Jalur penilaian satu aspek (D6): aturan deterministik atau penilai LLM. */
export type GraderPath = "deterministic" | "llm";

/** Deskripsi satu aspek pada satu level skor, misalnya aspek "Dasar Hukum" pada skor 3. */
export interface RubricLevelDescriptor {
  score: number;
  text: string;
}

export interface RubricAspect {
  name: string;
  grader_path: GraderPath;
  /** Kosong untuk rubrik holistik; bila ada, server mewajibkan semua terisi dan berjumlah 100. */
  weight: number | null;
  definition: string;
  sort_order: number;
  level_descriptors: RubricLevelDescriptor[];
}

/** Satu level skala (0 sampai 5). is_passing data, bukan aturan tetap: rubrik baru boleh beda. */
export interface RubricLevel {
  score: number;
  label: string;
  is_passing: boolean;
}

export interface RubricVersion {
  id: string;
  version_no: number;
  /** Tanggal saja (YYYY-MM-DD). */
  effective_date: string;
  is_active: boolean;
  /** Terisi sejak versi pertama kali aktif; isinya tertutup sejak itu. */
  locked_at: string | null;
  judge_prompt_quality: string;
  judge_prompt_format: string;
  /** Penyetuju versi baru masih TBA dari klien, jadi boleh kosong. */
  approved_by_name: string | null;
  approved_at: string | null;
  created_by_name: string | null;
  created_at: string;
  aspects: RubricAspect[];
  levels: RubricLevel[];
}

/** POST /rubrics: versi baru. Versi yang sudah ada tidak pernah diubah (immutable). */
export interface CreateRubricVersionRequest {
  effective_date: string;
  judge_prompt_quality: string;
  judge_prompt_format: string;
  approved_by_name: string | null;
  approved_at: string | null;
  aspects: RubricAspect[];
  levels: RubricLevel[];
}

/** POST /measurements/{id}/grade dengan versi yang dipilih Admin (AC7). */
export interface RegradeRequest {
  rubric_version_id: string;
}

export type GradingRunKind = "initial" | "regrade";
export type GradingRunStatus = "queued" | "running" | "finished" | "failed";

/** Satu baris riwayat penilaian sesi. Nilai ulang menambah baris, tidak pernah menghapus yang lama. */
export interface GradingRun {
  id: string;
  kind: GradingRunKind;
  status: GradingRunStatus;
  rubric_version_id: string;
  rubric_version_no: number;
  triggered_by_name: string | null;
  triggered_at: string;
  /** Tepat satu run per sesi bertanda terbaru; hasil lama tetap tersimpan. */
  is_latest: boolean;
}
