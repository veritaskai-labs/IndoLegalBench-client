import type {
  ReportCaseBasisRead,
  ReportDetail,
  ReportResultRead,
  ReportSessionRead,
  ScoreSplit,
} from "@/types/reports";

/**
 * Data contoh bersama untuk laporan perbandingan (PBI-15), supaya bentuk schema PR #145 tidak disalin per file.
 * Dipakai juga oleh SCRUM-321, FE PBI-16, FE PBI-17, dan QA SCRUM-323. Semua angka sintetis (L3), bukan hasil
 * pengukuran produk mana pun. Urutan sesi sengaja tidak sama dengan urutan peringkat, seperti data dari server.
 */

export function reportResult(overrides: Partial<ReportResultRead> = {}): ReportResultRead {
  return {
    score_split: "test",
    cases_graded_count: 50,
    cases_basis_count: 42,
    det_score: "0.91",
    llm_score: "0.87",
    total_score: "0.89",
    failure_rate: "1.20",
    rank: 1,
    repetitions: 3,
    product_model_version: "v2.1",
    judge_model_version: "judge-a",
    ...overrides,
  };
}

export function reportSession(overrides: Partial<ReportSessionRead> = {}): ReportSessionRead {
  return {
    session_id: "session-aiyu",
    product_id: "product-aiyu",
    product_label: "AiYU",
    measurement_kind: "automatic",
    markers: [],
    results: [reportResult()],
    ...overrides,
  };
}

export function caseBasis(count: number): ReportCaseBasisRead[] {
  return Array.from({ length: count }, (_, index) => ({
    case_code: `ILB-${String(index + 1).padStart(3, "0")}`,
    case_version_no: (index + 1) % 4 === 0 ? 2 : 1,
    split_tag: "test",
  }));
}

/** Skor satu produk untuk satu split; peringkat dan skor total mengikuti aturan SA di D1. */
type Scores = Pick<ReportResultRead, "det_score" | "llm_score" | "total_score" | "rank" | "failure_rate">;

const TEST_SCORES: Record<string, Scores> = {
  AiYU: { det_score: "0.91", llm_score: "0.87", total_score: "0.89", rank: 1, failure_rate: "1.20" },
  Gemini: { det_score: "0.84", llm_score: "0.88", total_score: "0.86", rank: 2, failure_rate: "0.00" },
  // Rata-ratanya sama dengan Justisio; DeepSeek di atas karena skor LLM lebih tinggi (seri, D1).
  DeepSeek: { det_score: "0.80", llm_score: "0.86", total_score: "0.83", rank: 3, failure_rate: "3.45" },
  Justisio: { det_score: "0.86", llm_score: "0.80", total_score: "0.83", rank: 4, failure_rate: "0.80" },
  // Skor LLM kosong, jadi skor total dan peringkat kosong (D1). Manual: tingkat kegagalan tidak berlaku.
  LegalHero: { det_score: "0.78", llm_score: null, total_score: null, rank: null, failure_rate: null },
};

const DEV_SCORES: Record<string, Scores> = {
  AiYU: { det_score: "0.88", llm_score: "0.90", total_score: "0.89", rank: 1, failure_rate: "0.95" },
  Gemini: { det_score: "0.86", llm_score: "0.85", total_score: "0.86", rank: 2, failure_rate: "0.00" },
  Justisio: { det_score: "0.82", llm_score: "0.81", total_score: "0.82", rank: 3, failure_rate: "1.10" },
  DeepSeek: { det_score: "0.79", llm_score: "0.83", total_score: "0.81", rank: 4, failure_rate: "2.90" },
  LegalHero: { det_score: "0.75", llm_score: null, total_score: null, rank: null, failure_rate: null },
};

const COMBINED_SCORES: Record<string, Scores> = {
  AiYU: { det_score: "0.90", llm_score: "0.88", total_score: "0.89", rank: 1, failure_rate: "1.10" },
  Gemini: { det_score: "0.85", llm_score: "0.87", total_score: "0.86", rank: 2, failure_rate: "0.00" },
  DeepSeek: { det_score: "0.80", llm_score: "0.85", total_score: "0.83", rank: 3, failure_rate: "3.25" },
  Justisio: { det_score: "0.84", llm_score: "0.80", total_score: "0.82", rank: 4, failure_rate: "0.92" },
  LegalHero: { det_score: "0.77", llm_score: null, total_score: null, rank: null, failure_rate: null },
};

const PRODUCTS: ReadonlyArray<Pick<ReportSessionRead, "product_label" | "measurement_kind" | "markers"> & { version: string | null }> = [
  { product_label: "Justisio", measurement_kind: "automatic", markers: [], version: "v1.4" },
  {
    product_label: "LegalHero",
    measurement_kind: "manual",
    markers: [{ code: "repetitions_differ" }, { code: "refusals", detail: "2" }],
    version: null,
  },
  { product_label: "AiYU", measurement_kind: "automatic", markers: [], version: "v2.1" },
  { product_label: "DeepSeek", measurement_kind: "automatic", markers: [{ code: "model_version_differs" }], version: "V3" },
  { product_label: "Gemini", measurement_kind: "automatic", markers: [{ code: "trial" }], version: "2.5" },
];

const SPLIT_SCORES: Record<ScoreSplit, Record<string, Scores>> = {
  test: TEST_SCORES,
  dev: DEV_SCORES,
  combined: COMBINED_SCORES,
};

function sessionsFor(splits: readonly ScoreSplit[]): ReportSessionRead[] {
  return PRODUCTS.map(({ version, ...product }) => {
    const slug = product.product_label.toLowerCase();
    const manual = product.measurement_kind === "manual";
    return reportSession({
      ...product,
      session_id: `session-${slug}`,
      product_id: `product-${slug}`,
      results: splits.map((split) =>
        reportResult({
          ...SPLIT_SCORES[split][product.product_label],
          score_split: split,
          cases_graded_count: manual ? 42 : 50,
          repetitions: manual ? 1 : 3,
          product_model_version: version,
        }),
      ),
    });
  });
}

/** Laporan pertama (AC11): lima produk, nilai Test saja, seperti yang diterima Viewer dan Kontributor. */
export function firstReport(overrides: Partial<ReportDetail> = {}): ReportDetail {
  return {
    id: "8f1c2d3e-0000-4000-8000-000000000001",
    title: "Perbandingan 5 produk, Oktober 2026",
    score_scope: "test",
    has_dev_scores: false,
    status: "saved",
    language: "en",
    created_by: "user-viewer",
    created_at: "2026-11-19T03:15:00Z",
    measurement_filter: "all",
    rubric_version_no: 3,
    judge_model_name: "model-penilai-a",
    case_basis_count: 42,
    sessions: sessionsFor(["test"]),
    case_basis: caseBasis(42),
    ...overrides,
  };
}

/** Laporan Dev + Test untuk Admin atau Developer AI: tiga baris hasil per sesi dan penanda skor dev. */
export function devTestReport(overrides: Partial<ReportDetail> = {}): ReportDetail {
  return firstReport({
    id: "8f1c2d3e-0000-4000-8000-000000000002",
    title: "Uji internal AiYU dan pesaing",
    score_scope: "dev_test",
    has_dev_scores: true,
    language: "id",
    created_by: "user-admin",
    sessions: sessionsFor(["test", "dev", "combined"]),
    ...overrides,
  });
}
