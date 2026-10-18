/**
 * Bentuk GET /dashboard dari SCRUM-154. Ditulis tangan karena jalurnya belum ada di
 * contract/openapi.json; diganti ke components["schemas"][…] begitu PR server itu merge.
 */
export type CaseCounts = {
  draft: number;
  in_review: number;
  needs_revision: number;
  approved: number;
};

/** Satu baris antrean reviewer. waiting_since adalah saat putaran dibuka (AC6). */
export type PendingReview = {
  assignment_id: string;
  case_id: string;
  case_code: string;
  title: string;
  round_no: number;
  waiting_since: string;
  assigned_at: string;
};

export type DashboardSummary = {
  /** Waktu data dihitung server (AC2). */
  generated_at: string;
  case_counts: CaseCounts;
  total_cases: number;
  waiting_for_review: number;
  /** Hanya Reviewer, terlama dulu; null untuk peran lain. */
  review_queue: PendingReview[] | null;
  /** Hanya Admin; null untuk peran lain. */
  needs_reassignment: number | null;
  /** Selalu null sampai PBI-11 mengisinya. */
  latest_run: null;
};