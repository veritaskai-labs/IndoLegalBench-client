"use client";

import { ErrorState } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import type { useCaseReview } from "@/hooks/useCaseReview";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import { SecondReviewerPanel } from "./SecondReviewerPanel";

const COPY = messages({
  id: { loading: "Memuat peninjau kedua…" },
  en: { loading: "Loading the second reviewer…" },
});

type Props = {
  caseReview: ReturnType<typeof useCaseReview>;
  myAssignmentId: string;
};

/** Kartu kanan halaman penilaian: peninjau kedua, atau keadaan memuat dan gagalnya. */
export function SecondReviewerSlot({ caseReview, myAssignmentId }: Readonly<Props>) {
  const copy = useText(COPY);
  if (caseReview.status === "loading") return <LoadingState label={copy.loading} />;
  if (caseReview.status === "error") {
    return <ErrorState message={caseReview.message} onRetry={caseReview.reload} />;
  }
  if (caseReview.review === null) return null;
  return <SecondReviewerPanel review={caseReview.review} myAssignmentId={myAssignmentId} />;
}
