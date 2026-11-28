"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { listAssignedReviews } from "@/lib/reviews/reviewApi";
import { mapReviewError } from "@/lib/reviews/reviewErrors";
import { useAsyncResource } from "./useAsyncResource";

/**
 * Antrean tinjauan reviewer yang login. Daftar kosong tetap status ready. Server menjawab 403 untuk
 * siapa pun selain reviewer, dan setiap 403 memindahkan pengguna ke /forbidden, jadi saat enabled
 * false tidak ada permintaan sama sekali.
 */
export function useAssignedReviews(enabled: boolean) {
  const locale = useLocale();
  const { reload, ...resource } = useAsyncResource(
    String(enabled),
    () => (enabled ? listAssignedReviews() : Promise.resolve([])),
    (error) => mapReviewError(error, "list", locale),
  );

  if (resource.status === "ready") return { status: "ready" as const, reviews: resource.data, reload };
  return { ...resource, reload };
}
