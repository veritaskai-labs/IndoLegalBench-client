import type { AsyncResource } from "@/hooks/useAsyncResource";
import type { EstimateView } from "@/lib/grading/gradeEstimate";

export function GradeEstimateTable(_props: Readonly<{ estimate: AsyncResource<EstimateView | null> & { reload: () => void } }>) {
  return null;
}
