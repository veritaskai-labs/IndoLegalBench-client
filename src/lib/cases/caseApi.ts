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

function casePath(caseId: string): string {
  return `/cases/${encodeURIComponent(caseId)}`;
}

/** GET /cases/{case_id}. */
export function getCase(caseId: string): Promise<CaseRead> {
  return apiFetch<CaseRead>(casePath(caseId));
}

/** PUT /cases/{case_id}. Server tetap yang menentukan status dan siapa boleh mengubah split_tag. */
export function updateCase(caseId: string, payload: CaseWritePayload): Promise<CaseRead> {
  return apiFetch<CaseRead>(casePath(caseId), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
