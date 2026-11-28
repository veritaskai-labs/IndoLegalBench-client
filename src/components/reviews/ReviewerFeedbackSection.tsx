"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFoundCaseReview } from "@/hooks/useFoundCaseReview";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import type { CaseStatus } from "@/types/case";
import { ReviewerFeedback } from "./ReviewerFeedback";

const COPY = messages({
  id: { loading: "Memuat catatan peninjau…" },
  en: { loading: "Loading reviewer notes…" },
});

/**
 * Memuat dan menampilkan catatan peninjau satu kasus. Pemanggil memasangnya untuk peran yang mungkin
 * berhak (canReadReviewFeedback); server yang memutuskan. Bukan pihak di kasus ini atau kasus belum
 * pernah diajukan berarti bagian ini tidak tampil sama sekali.
 */
export function ReviewerFeedbackSection({
  caseId,
  caseStatus = null,
}: Readonly<{ caseId: string; caseStatus?: CaseStatus | null }>) {
  const copy = useText(COPY);
  const feedback = useFoundCaseReview(caseId);

  if (feedback.status === "loading") return <LoadingState label={copy.loading} />;
  if (feedback.status === "error") return <ErrorState message={feedback.message} onRetry={feedback.reload} />;
  if (feedback.review === null) return null;

  return <ReviewerFeedback review={feedback.review} caseStatus={caseStatus} />;
}
