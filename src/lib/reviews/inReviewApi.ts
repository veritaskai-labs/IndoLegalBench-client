import { getCasesForSuite } from "@/lib/api/cases";
import { getOpenCaseVersion } from "@/lib/cases/versionApi";
import { getCaseReview } from "@/lib/reviews/reviewApi";
import { listActiveSuites } from "@/lib/suites/suiteApi";
import type { CaseSummary } from "@/lib/api/cases";
import type { CaseReview } from "@/types/reviewAdmin";
import { ApiError } from "@/lib/apiClient";

export type InReviewRow = {
  case: CaseSummary;
  review: CaseReview | null;
  /** Nomor versi baru yang sedang direview pada kasus yang sudah disetujui; null untuk review pertama. */
  newVersion: number | null;
};

/**
 * AC3. Server belum punya satu endpoint daftar kasus in_review untuk admin, jadi daftarnya
 * disusun di sini: suite aktif, kasus in_review dan approved tiap suite, lalu review tiap kasus.
 * Kasus approved ikut dibaca karena versi barunya bisa sedang direview sementara status kasus
 * tetap approved (F-02 Pra-UAT). Jumlah permintaannya 1 + 2 × jumlah suite + jumlah kasus;
 * ini yang akan menyusut jadi satu permintaan begitu endpoint daftarnya ada.
 */
export async function listInReviewCases(): Promise<InReviewRow[]> {
  const suites = await listActiveSuites();

  const [inReview, approved] = await Promise.all([
    casesWithStatus(suites.map((suite) => suite.id), "in_review"),
    casesWithStatus(suites.map((suite) => suite.id), "approved"),
  ]);

  const firstReviews = inReview.map((item) => withReview(item, null));
  const newVersions = (await Promise.all(approved.map(versionInReview))).flatMap(
    (found, index) => (found === null ? [] : [withReview(approved[index], found)]),
  );

  return Promise.all([...firstReviews, ...newVersions]);
}

async function casesWithStatus(
  suiteIds: string[],
  status: "in_review" | "approved",
): Promise<CaseSummary[]> {
  const perSuite = await Promise.all(
    suiteIds.map((suiteId) => getCasesForSuite(suiteId, { status })),
  );
  return perSuite.flat();
}

async function withReview(item: CaseSummary, newVersion: number | null): Promise<InReviewRow> {
  return { case: item, review: await reviewOrNull(item.id), newVersion };
}

/** Nomor versi terbuka bila versi itu sedang direview; draf atau revisi belum di tangan reviewer. */
async function versionInReview(item: CaseSummary): Promise<number | null> {
  try {
    const open = await getOpenCaseVersion(item.id);
    return open.status === "in_review" ? open.version : null;
  } catch (failure) {
    // 404 NO_OPEN_VERSION berarti versi yang disetujui adalah yang terakhir.
    if (failure instanceof ApiError && failure.status === 404) return null;
    throw failure;
  }
}

async function reviewOrNull(caseId: string): Promise<CaseReview | null> {
  try {
    return await getCaseReview(caseId);
  } catch (failure) {
    // 404 NO_REVIEW_ROUND memang berarti kasus ini belum punya ronde.
    // Galat lain (500, jaringan) harus naik, supaya tabnya menampilkan "Coba lagi".
    if (failure instanceof ApiError && failure.status === 404) return null;
    throw failure;
  }
}
