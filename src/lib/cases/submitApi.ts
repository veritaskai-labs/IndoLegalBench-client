import { apiFetch } from "@/lib/apiClient";
import type { components } from "@/lib/generated/api";

export type ReviewSubmission = components["schemas"]["ReviewSubmission"];

export function submitForReview(caseId: string): Promise<ReviewSubmission> {
  return apiFetch<ReviewSubmission>(
    `/cases/${encodeURIComponent(caseId)}/submit-review`,
    {
      method: "POST",
    },
  );
}
