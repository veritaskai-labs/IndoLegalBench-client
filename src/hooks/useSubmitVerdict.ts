"use client";

import { useCallback } from "react";
import { submitVerdict } from "@/lib/reviews/reviewApi";
import { mapReviewError } from "@/lib/reviews/reviewErrors";
import type { VerdictResult, VerdictWrite } from "@/types/review";
import { useAsyncAction } from "./useAsyncAction";

const submitMessage = (error: unknown) => mapReviewError(error, "submit");

/**
 * Mengirim penilaian reviewer. Hasilnya diserahkan ke onSubmitted karena halaman harus menampilkan
 * penilaian sendiri dan status round dari balasan itu: penugasan yang round-nya selesai sudah tidak
 * ada lagi di antrean. Tombol dinonaktifkan sampai ada keputusan, jadi verdict null tidak dikirim.
 */
export function useSubmitVerdict(
  assignmentId: string,
  verdict: VerdictWrite | null,
  onSubmitted: (result: VerdictResult) => void,
) {
  const action = useCallback(() => {
    if (verdict === null) return Promise.reject(new Error("Belum ada keputusan"));
    return submitVerdict(assignmentId, verdict);
  }, [assignmentId, verdict]);
  const { run, pending, error } = useAsyncAction(action, onSubmitted, submitMessage);
  return { submit: run, pending, error };
}
