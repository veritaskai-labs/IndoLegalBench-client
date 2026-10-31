"use client";

import { canReadReviewFeedback } from "@/lib/cases/permissions";
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
 * Memutuskan apakah catatan peninjau satu kasus ditawarkan sama sekali: hanya admin dan Kontributor,
 * di semua status kasus. Peran lain tidak meminta apa pun karena server menjawab 403. Kontributor
 * yang bukan pihak di kasus ini mendapat jawaban kosong dari bagian ini, tanpa dialihkan.
 */
export function ReviewerFeedbackGate({ caseId, user, status }: Readonly<Props>) {
  const canRead = canReadReviewFeedback(user?.role ?? null, status);
  return canRead ? <ReviewerFeedbackSection caseId={caseId} /> : null;
}
