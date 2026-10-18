"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCaseReview } from "@/hooks/useCaseReview";
import { ReviewerFeedback } from "./ReviewerFeedback";

/**
 * Memuat dan menampilkan catatan peninjau satu kasus. Pemanggil yang memutuskan boleh tidaknya
 * bagian ini dipasang (canReadReviewFeedback), karena server menjawab 403 untuk yang tidak berhak.
 */
export function ReviewerFeedbackSection({ caseId }: Readonly<{ caseId: string }>) {
  const feedback = useCaseReview(caseId, true);

  if (feedback.status === "loading") return <LoadingState label="Memuat catatan peninjau…" />;
  if (feedback.status === "error") return <ErrorState message={feedback.message} onRetry={feedback.reload} />;
  if (feedback.review === null) return null;

  return <ReviewerFeedback review={feedback.review} />;
}
