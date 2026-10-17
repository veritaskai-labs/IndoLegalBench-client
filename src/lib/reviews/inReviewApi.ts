import { getCasesForSuite } from "@/lib/api/cases";
import { getCaseReview } from "@/lib/reviews/reviewApi";
import { listActiveSuites } from "@/lib/suites/suiteApi";
import type { CaseSummary } from "@/lib/api/cases";
import type { CaseReview } from "@/types/reviewAdmin";

export type InReviewRow = {
  case: CaseSummary;
  review: CaseReview | null;
};

/**
 * AC3. Server belum punya satu endpoint daftar kasus in_review untuk admin, jadi daftarnya
 * disusun di sini: suite aktif, kasus in_review tiap suite, lalu review tiap kasus.
 * Jumlah permintaannya 1 + jumlah suite + jumlah kasus; ini yang akan menyusut jadi satu
 * permintaan begitu endpoint daftarnya ada.
 */
export async function listInReviewCases(): Promise<InReviewRow[]> {
  const suites = await listActiveSuites();

  const perSuite = await Promise.all(
    suites.map((suite) => getCasesForSuite(suite.id, { status: "in_review" })),
  );

  return Promise.all(
    perSuite.flat().map(async (item) => ({
      case: item,
      review: await reviewOrNull(item.id),
    })),
  );
}

/** Kasus yang belum punya ronde (404 NO_REVIEW_ROUND) tetap tampil, reviewnya kosong. */
async function reviewOrNull(caseId: string): Promise<CaseReview | null> {
  try {
    return await getCaseReview(caseId);
  } catch {
    return null;
  }
}