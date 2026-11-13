import type { AsyncResource } from "@/hooks/useAsyncResource";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import type { SessionGradingResponse } from "@/types/grading";

// Skeleton for the red commit: the behaviour comes in the green commit.
export function useSessionRun(
  sessionId: string,
  runId: string,
  gateway?: GradingGateway,
): AsyncResource<SessionGradingResponse> & { reload: () => void } {
  void [sessionId, runId, gateway];
  return { status: "loading", reload: () => {} };
}
