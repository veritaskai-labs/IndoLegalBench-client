import { apiFetch } from "@/lib/apiClient";
import type { components } from "@/lib/generated/api";
import type { LegalRefPayload } from "./caseFormMapping";

export type LegalRefPreviewItem = components["schemas"]["LegalRefPreviewItem"];
type LegalRefPreviewRequest = components["schemas"]["LegalRefPreviewRequest"];
type LegalRefPreviewResponse = components["schemas"]["LegalRefPreviewResponse"];

/**
 * POST /legal-refs/preview (SCRUM-162). Satu hasil per rujukan: teks rujukan dari server bila
 * rujukannya sah, atau masalah pertamanya dengan code dan field yang sama seperti simpan.
 * case_id hanya dikirim untuk kasus yang sudah ada, supaya jenis nonaktif yang sudah tersimpan
 * diperlakukan sama seperti saat simpan.
 */
export async function previewLegalRefs(
  legalRefs: LegalRefPayload[],
  caseId: string | null,
  signal?: AbortSignal,
): Promise<LegalRefPreviewItem[]> {
  const body: LegalRefPreviewRequest =
    caseId === null ? { legal_refs: legalRefs } : { legal_refs: legalRefs, case_id: caseId };
  const response = await apiFetch<LegalRefPreviewResponse>("/legal-refs/preview", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  return response.items;
}
