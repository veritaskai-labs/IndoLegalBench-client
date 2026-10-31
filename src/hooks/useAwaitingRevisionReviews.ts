"use client";

import { listAwaitingRevision } from "@/lib/reviews/reviewApi";
import { mapReviewError } from "@/lib/reviews/reviewErrors";
import { useAsyncResource } from "./useAsyncResource";

const listMessage = (error: unknown) => mapReviewError(error, "awaitingRevision");

/**
 * Kasus yang sudah dinilai reviewer yang login dan menunggu revisi Author. Daftar kosong tetap status
 * ready. Server menjawab 403 untuk siapa pun selain reviewer, dan setiap 403 memindahkan pengguna ke
 * /forbidden, jadi saat enabled false tidak ada permintaan sama sekali.
 */
export function useAwaitingRevisionReviews(enabled: boolean) {
  const { reload, ...resource } = useAsyncResource(
    String(enabled),
    () => (enabled ? listAwaitingRevision() : Promise.resolve([])),
    listMessage,
  );

  if (resource.status === "ready") return { status: "ready" as const, reviews: resource.data, reload };
  return { ...resource, reload };
}
