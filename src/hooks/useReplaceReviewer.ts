"use client";

import { useCallback, useRef, useState } from "react";

import { replaceReviewer } from "@/lib/reviews/reviewApi";
import { mapReplaceError } from "@/lib/reviews/replaceErrors";
import type { ReplaceReviewerBody } from "@/types/reviewAdmin";

/**
 * AC7. Pola sama dengan useAsyncAction, tapi berdiri sendiri karena aksinya butuh
 * argumen (id penugasan dan alasan) yang baru diketahui saat admin menekan konfirmasi.
 * onDone dipakai halaman untuk menyegarkan antrean setelah penggantian berhasil.
 */
export function useReplaceReviewer(onDone: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref, bukan state: klik kedua bisa masuk sebelum render ulang menonaktifkan tombol.
  const inFlight = useRef(false);

  const replace = useCallback(
    async (assignmentId: string, body: ReplaceReviewerBody) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(true);
      setError(null);

      let succeeded = false;
      try {
        await replaceReviewer(assignmentId, body);
        succeeded = true;
      } catch (failure) {
        setError(mapReplaceError(failure));
      } finally {
        inFlight.current = false;
        setPending(false);
      }

      // Di luar try: galat di onDone bukan kegagalan permintaan, dan reviewer sudah terganti.
      if (succeeded) onDone();
    },
    [onDone],
  );

  const reset = useCallback(() => setError(null), []);

  return { replace, pending, error, reset };
}