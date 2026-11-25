import { apiFetch } from "@/lib/apiClient";
import type { components } from "@/lib/generated/api";
import type { CaseStatus, SplitTag } from "@/types/case";

export type { CaseStatus, SplitTag } from "@/types/case";
export type CaseSummary = components["schemas"]["CaseSummary"];

export interface ListCasesParams {
  status?: CaseStatus;
  split_tag?: SplitTag;
}

export async function getCasesForSuite(
  suiteId: string,
  params?: ListCasesParams
): Promise<CaseSummary[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.split_tag) query.append("split_tag", params.split_tag);

  const queryString = query.toString();
  const endpoint = `/suites/${suiteId}/cases${queryString ? `?${queryString}` : ""}`;
  return apiFetch<CaseSummary[]>(endpoint);
}
