"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { listNeedsReassignment } from "@/lib/reviews/reviewApi";
import type { ReassignmentRow } from "@/types/reviewAdmin";

const COPY = messages({
  id: {
    forbidden: "Hanya Admin yang boleh membuka pemantauan review.",
    failed: "Gagal memuat antrean penugasan ulang. Coba lagi.",
  },
  en: {
    forbidden: "Only an Admin can open review monitoring.",
    failed: "Could not load the reassignment queue. Try again.",
  },
});

/** AC8. 403 dibedakan karena itu satu-satunya kegagalan yang bisa ditindaklanjuti pengguna. Kuncinya tetap, jadi reload cukup untuk menyegarkan setelah reviewer diganti. */
export function useNeedsReassignment() {
  const copy = useText(COPY);
  return useAsyncResource<ReassignmentRow[]>(
    "needs-reassignment",
    listNeedsReassignment,
    (error) => (error instanceof ApiError && error.status === 403 ? copy.forbidden : copy.failed),
  );
}