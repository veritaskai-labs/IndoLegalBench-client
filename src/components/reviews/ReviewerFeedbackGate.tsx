"use client";

import { useCanReadReviewFeedback } from "@/hooks/useCanReadReviewFeedback";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { ReviewerFeedbackSection } from "./ReviewerFeedbackSection";

type Props = {
  caseId: string;
  user: { id: string; role: Role } | null;
  /** null selama kasus belum dimuat. */
  status: CaseStatus | null;
};

/**
 * Memutuskan apakah catatan peninjau satu kasus tampil sama sekali. Server menjawab 403 untuk yang
 * tidak berhak dan setiap 403 memindahkan pengguna ke /forbidden, jadi bagian ini tidak dipasang dan
 * tidak meminta apa pun kecuali untuk admin atau pembuat kasus yang kasusnya perlu revisi.
 */
export function ReviewerFeedbackGate({ caseId, user, status }: Readonly<Props>) {
  const canRead = useCanReadReviewFeedback(caseId, user, status);
  return canRead ? <ReviewerFeedbackSection caseId={caseId} /> : null;
}
