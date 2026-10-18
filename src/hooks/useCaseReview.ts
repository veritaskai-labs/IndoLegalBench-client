"use client";

import { getCaseReview } from "@/lib/reviews/reviewApi";
import { mapReviewError } from "@/lib/reviews/reviewErrors";
import { useAsyncResource } from "./useAsyncResource";

const reviewMessage = (error: unknown) => mapReviewError(error, "caseReview");

/**
 * Round terakhir sebuah kasus beserta penilaian yang boleh dilihat pengguna. Server menjawab 403 untuk
 * yang tidak berhak dan itu memindahkan pengguna ke /forbidden, jadi saat enabled false tidak ada
 * permintaan dan review bernilai null. refreshKey memuat ulang, misalnya setelah verdict terkirim.
 */
export function useCaseReview(caseId: string, enabled: boolean, refreshKey = "") {
  const { reload, ...resource } = useAsyncResource(
    `${caseId}|${enabled}|${refreshKey}`,
    () => (enabled ? getCaseReview(caseId) : Promise.resolve(null)),
    reviewMessage,
  );

  if (resource.status === "ready") return { status: "ready" as const, review: resource.data, reload };
  return { ...resource, reload };
}
