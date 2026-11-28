"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { listInReviewCases } from "@/lib/reviews/inReviewApi";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";

const COPY = messages({
  id: {
    forbidden: "Hanya Admin yang boleh membuka pemantauan review.",
    failed: "Gagal memuat kasus yang sedang direview. Coba lagi.",
  },
  en: {
    forbidden: "Only an Admin can open review monitoring.",
    failed: "Could not load cases under review. Try again.",
  },
});

/** AC3. 403 dibedakan karena itu satu-satunya kegagalan yang bisa ditindaklanjuti pengguna. Kuncinya tetap, jadi reload cukup untuk menyegarkan setelah reviewer diganti. */
export function useInReviewCases() {
  const copy = useText(COPY);
  return useAsyncResource<InReviewRow[]>(
    "in-review-cases",
    listInReviewCases,
    (error) => (error instanceof ApiError && error.status === 403 ? copy.forbidden : copy.failed),
  );
}