import { ErrorState } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import type { useCaseReview } from "@/hooks/useCaseReview";
import { SecondReviewerPanel } from "./SecondReviewerPanel";

type Props = {
  caseReview: ReturnType<typeof useCaseReview>;
  myAssignmentId: string;
};

/** Kartu kanan halaman penilaian: peninjau kedua, atau keadaan memuat dan gagalnya. */
export function SecondReviewerSlot({ caseReview, myAssignmentId }: Readonly<Props>) {
  if (caseReview.status === "loading") return <LoadingState label="Memuat peninjau kedua…" />;
  if (caseReview.status === "error") {
    return <ErrorState message={caseReview.message} onRetry={caseReview.reload} />;
  }
  if (caseReview.review === null) return null;
  return <SecondReviewerPanel review={caseReview.review} myAssignmentId={myAssignmentId} />;
}
