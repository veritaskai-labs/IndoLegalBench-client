import { apiFetch } from "@/lib/apiClient";

export type SplitTag = "dev" | "test";
export type CaseStatus = "draft" | "in_review" | "needs_revision" | "approved";

export interface CaseSummary {
  id: string;
  case_code: string;
  title: string;
  split_tag: SplitTag;
  status: CaseStatus;
  completeness_pct: number;
  updated_at: string;
}

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