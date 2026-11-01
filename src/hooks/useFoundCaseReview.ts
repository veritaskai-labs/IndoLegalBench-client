"use client";

import { findCaseReview } from "@/lib/reviews/reviewApi";
import { mapReviewError } from "@/lib/reviews/reviewErrors";
import { useAsyncResource } from "./useAsyncResource";

const reviewMessage = (error: unknown) => mapReviewError(error, "caseReview");

/**
 * Catatan peninjau satu kasus untuk halaman kasus. review bernilai null bila pengguna bukan pihak di
 * kasus ini atau kasusnya belum pernah diajukan: itu jawaban, bukan error, dan tidak memindahkan
 * pengguna ke /forbidden.
 */
export function useFoundCaseReview(caseId: string) {
  const { reload, ...resource } = useAsyncResource(caseId, () => findCaseReview(caseId), reviewMessage);

  if (resource.status === "ready") return { status: "ready" as const, review: resource.data, reload };
  return { ...resource, reload };
}
