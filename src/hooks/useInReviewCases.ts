"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { listInReviewCases } from "@/lib/reviews/inReviewApi";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";

/** 403 dibedakan karena itu satu-satunya kegagalan yang bisa ditindaklanjuti pengguna. */
function toMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Hanya Admin yang boleh membuka pemantauan review.";
  }
  return "Gagal memuat kasus yang sedang direview. Coba lagi.";
}

/** AC3. Kuncinya tetap, jadi reload cukup untuk menyegarkan setelah reviewer diganti. */
export function useInReviewCases() {
  return useAsyncResource<InReviewRow[]>(
    "in-review-cases",
    listInReviewCases,
    toMessage,
  );
}