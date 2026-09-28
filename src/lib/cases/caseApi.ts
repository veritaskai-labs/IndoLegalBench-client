import { apiFetch } from "@/lib/apiClient";
import type { components } from "@/lib/generated/api";
import type { CaseWritePayload } from "./caseFormMapping";

type CaseRead = components["schemas"]["CaseRead"];

/** POST /suites/{suite_id}/cases. Kasus baru selalu disimpan server sebagai draf. */
export function createCase(suiteId: string, payload: CaseWritePayload): Promise<CaseRead> {
  return apiFetch<CaseRead>(`/suites/${encodeURIComponent(suiteId)}/cases`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
