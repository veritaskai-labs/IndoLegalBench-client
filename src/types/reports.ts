import type { components } from "@/lib/generated/api";

/*
 * Laporan perbandingan PBI-15 (SCRUM-322).
 *
 * SEMENTARA: endpoint /reports belum ada di contract/openapi.json. Bentuk di bawah mengikuti schema baca
 * draft server PR #145 (app/modules/reports/schemas.py, SCRUM-320) apa adanya: nama tipe, nama field, dan
 * nilai enum. Decimal dikirim sebagai string, uuid dan waktu juga string.
 *
 * Begitu endpoint SCRUM-320 masuk kontrak, setiap tipe di sini diganti alias components["schemas"][...] seperti
 * file tipe lain, lalu salinan ini dihapus (Fase 3 SCRUM-322, dicatat di PR #103).
 */

export type SplitTag = components["schemas"]["SplitTag"];

/** Jenis nilai yang dipilih saat membuat laporan (D1 reports.score_scope). */
export type ScoreScope = "test" | "dev" | "dev_test";

/** Satu baris hasil beku. Laporan Dev + Test menyimpan tiga baris per sesi (D1). */
export type ScoreSplit = "test" | "dev" | "combined";

export type MeasurementFilter = "automatic" | "manual" | "all";

/** Label otomatis/manual per produk (PBI-15 AC5). */
export type MeasurementKind = "automatic" | "manual";

export type ReportStatus = "saved" | "published" | "superseded";

/** Bahasa isi laporan dan PDF-nya, bawaan Inggris (PBI-26 AC1). */
export type ReportLanguage = "en" | "id";

/** Label produk di laporan, dipilih Admin saat membuat (PBI-15 AC9). */
export type ProductLabelMode = "real_name" | "code";

/** Penanda D2, misalnya "repetitions_differ". Uji Coba bukan penanda: ada di is_trial. `detail` berisi keterangan seperti jumlah. */
export type ReportMarker = {
  code: string;
  detail?: string | null;
};

/** Satu baris report_results: skor dua desimal tanpa persen. */
export type ReportResultRead = {
  score_split: ScoreSplit;
  cases_graded_count: number;
  cases_basis_count: number;
  det_score: string | null;
  llm_score: string | null;
  /** Hanya dipakai server untuk mengurutkan peringkat; tidak ditampilkan (keputusan SA di D1). */
  total_score: string | null;
  /** Persen dari total upaya termasuk coba ulang; null untuk produk manual. */
  failure_rate: string | null;
  rank: number | null;
  repetitions: number;
  product_model_version: string | null;
  judge_model_version: string | null;
};

/** Satu sesi (satu produk) di laporan beserta hasil bekunya. */
export type ReportSessionRead = {
  session_id: string;
  product_id: string;
  /** Nama asli atau kode produk, dipilih Admin saat membuat laporan. */
  product_label: string;
  measurement_kind: MeasurementKind;
  /** Sesi Uji Coba (AC4), wajib ditandai jelas. Bawaan server false. */
  is_trial?: boolean;
  /** Bawaan server kosong. */
  markers?: ReportMarker[];
  results: ReportResultRead[];
};

/** Satu kasus dasar perbandingan: hanya kode dan versi, tanpa isi kasus (D9). */
export type ReportCaseBasisRead = {
  case_code: string;
  case_version_no: number;
  split_tag: SplitTag;
};

/** Satu baris daftar laporan tersimpan (GET /reports). */
export type ReportSummary = {
  id: string;
  title: string;
  score_scope: ScoreScope;
  has_dev_scores: boolean;
  status: ReportStatus;
  language: ReportLanguage;
  created_by: string;
  created_at: string;
};

/** Laporan lengkap untuk dibuka ulang dan dicetak ke PDF (GET /reports/{id}). */
export type ReportDetail = ReportSummary & {
  measurement_filter: MeasurementFilter;
  product_label_mode?: ProductLabelMode;
  rubric_version_no: number | null;
  judge_model_name: string | null;
  case_basis_count: number;
  sessions: ReportSessionRead[];
  case_basis: ReportCaseBasisRead[];
};
