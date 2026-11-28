"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { listAwaitingRevision } from "@/lib/reviews/reviewApi";
import { mapReviewError } from "@/lib/reviews/reviewErrors";
import { useAsyncResource } from "./useAsyncResource";

/**
 * Kasus yang sudah dinilai reviewer yang login dan menunggu revisi Author. Daftar kosong tetap status
 * ready. Server menjawab 403 untuk siapa pun selain reviewer, dan setiap 403 memindahkan pengguna ke
 * /forbidden, jadi saat enabled false tidak ada permintaan sama sekali.
 */
export function useAwaitingRevisionReviews(enabled: boolean) {
  const locale = useLocale();
  const { reload, ...resource } = useAsyncResource(
    String(enabled),
    () => (enabled ? listAwaitingRevision() : Promise.resolve([])),
    (error) => mapReviewError(error, "awaitingRevision", locale),
  );

  if (resource.status === "ready") return { status: "ready" as const, reviews: resource.data, reload };
  return { ...resource, reload };
}
