"use client";

import { useEffect, useMemo, useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import {
  alignPreviews,
  buildPreviewRequest,
  type CitationPreview,
  type PreviewResult,
} from "@/lib/cases/legalRefPreview";
import { previewLegalRefs } from "@/lib/cases/legalRefPreviewApi";

/** Jeda setelah ketikan terakhir sebelum pratinjau diminta (PRD hal. 23, keputusan PO ~0,4 detik). */
export const PREVIEW_DELAY_MS = 400;

/**
 * Pratinjau rujukan hukum dari server saat Author mengetik (SCRUM-162). Satu request untuk semua
 * rujukan setelah jeda; ketikan baru membatalkan request yang masih berjalan, dan jawaban hanya
 * tampil di bawah rujukan yang isinya belum berubah. Gagal memuat tidak memblokir simpan.
 */
export function useLegalRefPreview(
  control: Control<CaseFormValues>,
  caseId: string | null,
  enabled: boolean,
): { previews: (CitationPreview | null)[]; failed: boolean } {
  const refs = useWatch({ control, name: "legal_refs" });
  const request = useMemo(() => buildPreviewRequest(refs), [refs]);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || request.payload.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      previewLegalRefs(request.payload, caseId, controller.signal).then(
        (items) => {
          if (controller.signal.aborted) return;
          setResult({ sent: request.sent, items });
          setFailed(false);
        },
        () => {
          // Batal karena ketikan baru atau editor ditutup bukan kegagalan.
          if (!controller.signal.aborted) setFailed(true);
        },
      );
    }, PREVIEW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [request, caseId, enabled]);

  return { previews: alignPreviews(refs, result), failed };
}
