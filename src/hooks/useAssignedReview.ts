"use client";

import { useAssignedReviews } from "./useAssignedReviews";

/**
 * Satu penugasan dari antrean yang sama. Server tidak punya endpoint untuk satu penugasan, dan daftarnya
 * hanya memuat penugasan aktif di round yang masih terbuka, jadi id yang tidak ada di daftar berarti
 * penugasan itu sudah selesai, diganti, atau bukan milik pengguna: assignment bernilai null.
 */
export function useAssignedReview(assignmentId: string, enabled: boolean) {
  const queue = useAssignedReviews(enabled);

  if (queue.status === "ready") {
    const assignment = queue.reviews.find((review) => review.assignment_id === assignmentId) ?? null;
    return { status: "ready" as const, assignment, reload: queue.reload };
  }
  return queue;
}
