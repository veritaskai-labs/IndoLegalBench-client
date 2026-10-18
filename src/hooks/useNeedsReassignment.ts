"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { listNeedsReassignment } from "@/lib/reviews/reviewApi";
import type { ReassignmentRow } from "@/types/reviewAdmin";

/** 403 dibedakan karena itu satu-satunya kegagalan yang bisa ditindaklanjuti pengguna. */
function toMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Hanya Admin yang boleh membuka pemantauan review.";
  }
  return "Gagal memuat antrean penugasan ulang. Coba lagi.";
}

/** AC8. Kuncinya tetap, jadi reload cukup untuk menyegarkan setelah reviewer diganti. */
export function useNeedsReassignment() {
  return useAsyncResource<ReassignmentRow[]>(
    "needs-reassignment",
    listNeedsReassignment,
    toMessage,
  );
}