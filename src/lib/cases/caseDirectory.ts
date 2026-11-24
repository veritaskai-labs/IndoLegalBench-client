import { apiFetch } from "@/lib/apiClient";
import type { components } from "@/lib/generated/api";
import type { CaseStatus } from "@/types/case";

export type CaseDirectoryRow = components["schemas"]["CaseListItem"];

export type CaseDirectoryQuery = {
  q: string;
  status: CaseStatus | "";
  suiteId: string;
  page: number;
};

export function listDirectoryCases({ q, status, suiteId, page }: CaseDirectoryQuery) {
  const query = new URLSearchParams({ page: String(page), size: "20" });
  const keyword = q.trim();
  if (keyword) query.set("q", keyword);
  if (status) query.set("status", status);
  if (suiteId) query.set("suite_id", suiteId);
  return apiFetch<components["schemas"]["CasePage"]>(`/cases?${query}`);
}
