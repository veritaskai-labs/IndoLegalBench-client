import { apiFetch } from "@/lib/apiClient";
import type { CaseRead, SplitTag } from "@/types/case";

/**
 * PATCH /cases/{case_id}/split-tag (SCRUM-164). Hanya Admin, hanya setelah kasus disetujui.
 * Dev ke test butuh confirm = true; tanpa itu server menjawab 409 TAG_CHANGE_NEEDS_CONFIRMATION.
 * Yang dikembalikan adalah versi yang berlaku, bukan draf yang sedang dibuka.
 */
export function changeSplitTag(caseId: string, splitTag: SplitTag, confirm: boolean): Promise<CaseRead> {
  return apiFetch<CaseRead>(`/cases/${encodeURIComponent(caseId)}/split-tag`, {
    method: "PATCH",
    body: JSON.stringify({ split_tag: splitTag, confirm }),
  });
}
