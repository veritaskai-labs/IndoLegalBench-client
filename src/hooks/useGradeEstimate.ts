import type { AsyncResource } from "@/hooks/useAsyncResource";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import type { EstimateView } from "@/lib/grading/gradeEstimate";
import { httpGradingGateway, type GradeOptions, type GradingGateway } from "@/lib/grading/gradingApi";

export function useGradeEstimate(
  _sessionId: string,
  _options: GradeOptions | null,
  _gateway: GradingGateway = httpGradingGateway,
  _judgeApi?: JudgeOptionsApi,
): AsyncResource<EstimateView | null> & { reload: () => void } {
  return { status: "loading", reload: () => {} };
}
