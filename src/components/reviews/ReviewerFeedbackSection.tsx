"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFoundCaseReview } from "@/hooks/useFoundCaseReview";
import { ReviewerFeedback } from "./ReviewerFeedback";

/**
 * Memuat dan menampilkan catatan peninjau satu kasus. Pemanggil memasangnya untuk peran yang mungkin
 * berhak (canReadReviewFeedback); server yang memutuskan. Bukan pihak di kasus ini atau kasus belum
 * pernah diajukan berarti bagian ini tidak tampil sama sekali.
 */
export function ReviewerFeedbackSection({ caseId }: Readonly<{ caseId: string }>) {
  const feedback = useFoundCaseReview(caseId);

  if (feedback.status === "loading") return <LoadingState label="Memuat catatan peninjau…" />;
  if (feedback.status === "error") return <ErrorState message={feedback.message} onRetry={feedback.reload} />;
  if (feedback.review === null) return null;

  return <ReviewerFeedback review={feedback.review} />;
}
