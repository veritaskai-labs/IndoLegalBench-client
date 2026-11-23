import type {
  EligibleSession,
  ReportValidation,
  ReportAttemptRead,
  ReportCaseBasisRead,
  ReportCaseDetailRead,
  ReportCaseScoreRead,
  ReportDetail,
  ReportDetailResultRead,
  ReportDetailSessionRead,
  ReportResultCasesRead,
  ScoreSplit,
} from "@/types/reports";

/**
 * Data contoh bersama untuk laporan perbandingan (PBI-15), supaya bentuk schema PR #145 tidak disalin per file.
 * Dipakai juga oleh SCRUM-321, FE PBI-16, FE PBI-17, dan QA SCRUM-323. Semua angka sintetis (L3), bukan hasil
 * pengukuran produk mana pun. Urutan sesi sengaja tidak sama dengan urutan peringkat, seperti data dari server.
 */

let resultCounter = 0;

/** Id angka laporan (server#149): kunci penelusuran PBI-16. Penghitung, bukan acak, supaya tes stabil. */
export function reportResult(overrides: Partial<ReportDetailResultRead> = {}): ReportDetailResultRead {
  resultCounter += 1;
  return {
    id: `result-${resultCounter}`,
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
    created_by: "user-viewer",
    // Same order as the server: report_sessions.product_label, alphabetical (SCRUM-363).
    products: PRODUCTS.map((product) => product.product_label).sort((a, b) => a.localeCompare(b)),
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
    created_by: "user-admin",
    sessions: sessionsFor(["test", "dev", "combined"]),
    ...overrides,
  });
}

/** One row of GET /reports/eligible-sessions (SCRUM-321, case_kinds from SCRUM-361): eligible, automatic, judge-1, product p-1. */
export function eligibleSession(overrides: Partial<EligibleSession> = {}): EligibleSession {
  return {
    session_id: "s-1",
    label: "Sesi A",
    product_id: "p-1",
    product_name: "Produk A",
    created_at: "2026-11-18T09:00:00Z",
    session_type: "automatic",
    purpose: "official",
    status: "finished",
    judge_model_version: "judge-1",
    case_kinds: ["test"],
    eligible: true,
    reasons: [],
    ...overrides,
  };
}

/** Jawaban POST /reports/validate (SCRUM-366): pilihan yang sah dengan semua jenis nilai tersedia, kecuali diganti. */
export function reportValidation(overrides: Partial<ReportValidation> = {}): ReportValidation {
  return {
    valid: true,
    violations: [],
    warnings: [],
    available_scopes: ["test", "dev", "dev_test"],
    ...overrides,
  } as ReportValidation;
}

/** Satu kasus dasar di balik angka (PBI-16 AC1, server#149): kode, versi, dan skornya, tanpa isi. */
export function caseScore(overrides: Partial<ReportCaseScoreRead> = {}): ReportCaseScoreRead {
  return {
    case_id: "c-1",
    case_code: "ILB-001",
    case_version_no: 2,
    split_tag: "test",
    det_score: "0.80",
    llm_score: "0.75",
    content_visible: true,
    ...overrides,
  };
}

/** Daftar kasus di balik angka test satu produk; satu kasus terbuka dan satu tertutup untuk peran ini (AC3). */
export function resultCases(overrides: Partial<ReportResultCasesRead> = {}): ReportResultCasesRead {
  return {
    report_id: "r-1",
    result_id: "res-1",
    product_label: "AiYU",
    measurement_kind: "manual",
    score_split: "test",
    rubric_version: "v3",
    cases: [
      caseScore(),
      caseScore({ case_id: "c-2", case_code: "ILB-002", case_version_no: 1, det_score: null, content_visible: false }),
    ],
    ...overrides,
  };
}

/** Satu percobaan yang dinilai (AC2); jawaban asli markdown, sintetis. */
export function reportAttempt(overrides: Partial<ReportAttemptRead> = {}): ReportAttemptRead {
  return {
    attempt_id: "a-1",
    repetition_no: 1,
    source: "automatic",
    status: "succeeded",
    graded: true,
    det_score: "0.80",
    llm_score: "0.75",
    answer_text: "**Pasal 151** UU Ketenagakerjaan mengatur PHK.",
    explanation: "Pasal yang dikutip tepat.",
    reasons: ["CITATION_OK"],
    criteria: [],
    filled_by_name: null,
    answered_at: null,
    ...overrides,
  };
}

/** Satu kasus sampai jawaban asli: satu percobaan dinilai dan satu gagal teknis (AC2). */
export function caseDetail(overrides: Partial<ReportCaseDetailRead> = {}): ReportCaseDetailRead {
  return {
    report_id: "r-1",
    result_id: "res-1",
    case_id: "c-1",
    case_code: "ILB-001",
    case_version_no: 2,
    split_tag: "test",
    title: "PHK sepihak",
    category: "Ketenagakerjaan",
    question: "Apakah PHK sepihak sah?",
    product_label: "AiYU",
    measurement_kind: "automatic",
    rubric_version: "v3",
    det_score: "0.80",
    llm_score: "0.75",
    attempts: [
      reportAttempt(),
      reportAttempt({
        attempt_id: "a-2",
        repetition_no: 2,
        status: "technical_failure",
        graded: false,
        det_score: null,
        llm_score: null,
        answer_text: null,
        explanation: null,
        reasons: [],
      }),
    ],
    ...overrides,
  };
}

