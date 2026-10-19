import { apiFetch } from "@/lib/apiClient";
import type { components } from "@/lib/generated/api";
import type { CaseReview } from "@/types/reviewAdmin";

type InReviewCase = components["schemas"]["InReviewCase"];

/** Kasus yang ditampilkan di tab: cukup untuk tabel dan dialog ganti reviewer. */
export type InReviewCaseRef = { id: string; case_code: string; title: string };

export type InReviewRow = {
  case: InReviewCaseRef;
  review: CaseReview;
  /** Nomor versi baru yang sedang direview pada kasus yang sudah disetujui; null untuk review pertama. */
  newVersion: number | null;
};

/**
 * AC3 dan F-02 Pra-UAT. GET /reviews/in-review: setiap kasus yang rondenya belum diputuskan,
 * terlama dulu, termasuk versi baru dari kasus yang statusnya tetap approved. Galat (403, 500)
 * naik ke hook, yang memilih pesannya.
 */
export async function listInReviewCases(): Promise<InReviewRow[]> {
  const items = await apiFetch<InReviewCase[]>("/reviews/in-review");
  return items.map(toRow);
}

/** version_no di atas 1 berarti ada versi lama yang disetujui dan masih berlaku. */
function toRow(item: InReviewCase): InReviewRow {
  return {
    case: { id: item.case_id, case_code: item.case_code, title: item.title },
    review: item.review,
    newVersion: item.version_no > 1 ? item.version_no : null,
  };
}
