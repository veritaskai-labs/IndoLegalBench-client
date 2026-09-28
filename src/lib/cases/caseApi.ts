import { apiFetch } from "@/lib/apiClient";
import type { CaseRead } from "@/types/case";
import type { CaseWritePayload } from "./caseFormMapping";

/** POST /suites/{suite_id}/cases. Kasus baru selalu disimpan server sebagai draf. */
export function createCase(suiteId: string, payload: CaseWritePayload): Promise<CaseRead> {
  return apiFetch<CaseRead>(`/suites/${encodeURIComponent(suiteId)}/cases`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
