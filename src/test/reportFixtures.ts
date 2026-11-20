import type {
  ReportCaseBasisRead,
  ReportDetail,
  ReportDetailResultRead,
  ReportDetailSessionRead,
  ScoreSplit,
} from "@/types/reports";

/**
 * Data contoh bersama untuk laporan perbandingan (PBI-15), supaya bentuk schema PR #145 tidak disalin per file.
 * Dipakai juga oleh SCRUM-321, FE PBI-16, FE PBI-17, dan QA SCRUM-323. Semua angka sintetis (L3), bukan hasil
 * pengukuran produk mana pun. Urutan sesi sengaja tidak sama dengan urutan peringkat, seperti data dari server.
 */

export function reportResult(overrides: Partial<ReportDetailResultRead> = {}): ReportDetailResultRead {
  return {
    score_split: "test",
    cases_graded_count: 50,
    cases_basis_count: 42,
    det_score: "0.91",
    llm_score: "0.87",
    failure_rate: "1.20",
    rank: 1,
    repetitions: 3,
    product_model_version: "v2.1",
    judge_model_version: "judge-a",
    ...overrides,
  };
}

export function reportSession(overrides: Partial<ReportDetailSessionRead> = {}): ReportDetailSessionRead {
  return {
    product_label: "AiYU",
    measurement_kind: "automatic",
    is_trial: false,
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

/**
 * Skor satu produk untuk satu split: [skor deterministik, skor LLM, peringkat, tingkat kegagalan].
 * Peringkat mengikuti aturan SA di D1: rata-rata kedua skor, seri dipecah skor LLM lalu deterministik. Satu baris per produk berisi ketiga split.
 */
type ScoreTuple = readonly [string, string | null, number | null, string | null];

const SCORES: Record<string, Record<ScoreSplit, ScoreTuple>> = {
  AiYU: { test: ["0.91", "0.87", 1, "1.20"], dev: ["0.88", "0.90", 1, "0.95"], combined: ["0.90", "0.88", 1, "1.10"] },
  Gemini: { test: ["0.84", "0.88", 2, "0.00"], dev: ["0.86", "0.85", 2, "0.00"], combined: ["0.85", "0.87", 2, "0.00"] },
  // Rata-rata test sama dengan Justisio; DeepSeek di atas karena skor LLM lebih tinggi (seri, D1).
  DeepSeek: { test: ["0.80", "0.86", 3, "3.45"], dev: ["0.79", "0.83", 4, "2.90"], combined: ["0.80", "0.85", 3, "3.25"] },
  Justisio: { test: ["0.86", "0.80", 4, "0.80"], dev: ["0.82", "0.81", 3, "1.10"], combined: ["0.84", "0.80", 4, "0.92"] },
  // Skor LLM kosong, jadi peringkat kosong (D1). Manual: tingkat kegagalan tidak berlaku.
  LegalHero: { test: ["0.78", null, null, null], dev: ["0.75", null, null, null], combined: ["0.77", null, null, null] },
};

function scoresOf(product: string, split: ScoreSplit): Partial<ReportDetailResultRead> {
  const [det_score, llm_score, rank, failure_rate] = SCORES[product][split];
  return { det_score, llm_score, rank, failure_rate };
}

const PRODUCTS: ReadonlyArray<
  Pick<ReportDetailSessionRead, "product_label" | "measurement_kind" | "markers"> & { is_trial?: boolean; version: string | null }
> = [
  { product_label: "Justisio", measurement_kind: "automatic", markers: [], version: "v1.4" },
  {
    product_label: "LegalHero",
    measurement_kind: "manual",
    markers: [{ code: "repetitions_differ" }, { code: "refusals", detail: "2" }],
    version: null,
  },
  { product_label: "AiYU", measurement_kind: "automatic", markers: [], version: "v2.1" },
  { product_label: "DeepSeek", measurement_kind: "automatic", markers: [{ code: "model_version_differs" }], version: "V3" },
  { product_label: "Gemini", measurement_kind: "automatic", is_trial: true, markers: [], version: "2.5" },
];

function sessionsFor(splits: readonly ScoreSplit[]): ReportDetailSessionRead[] {
  return PRODUCTS.map(({ version, ...product }) => {
    const manual = product.measurement_kind === "manual";
    return reportSession({
      ...product,
      results: splits.map((split) =>
        reportResult({
          ...scoresOf(product.product_label, split),
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
    product_label_mode: "real_name",
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
