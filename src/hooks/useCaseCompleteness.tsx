"use client";

import { useCallback, useEffect, useState } from "react";
import { getCaseCompleteness } from "@/lib/cases/caseApi";
import type { CaseCompleteness } from "@/types/case";

export type CompletenessState =
  | { status: "loading" }
  | { status: "ready"; completeness: CaseCompleteness }
  | { status: "error" };

type Result = { key: string } & ({ ok: true; completeness: CaseCompleteness } | { ok: false });

/**
 * Indikator kelengkapan satu kasus. `version` dinaikkan halaman setiap kali
 * kasus tersimpan, supaya indikator mengambil ulang hasil hitungan server.
 */
export function useCaseCompleteness(
  caseId: string,
  version: number,
): CompletenessState & { reload: () => void } {
  const [result, setResult] = useState<Result | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = `${caseId}:${version}:${nonce}`;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    getCaseCompleteness(caseId)
      .then((completeness) => {
        if (!cancelled) setResult({ key, ok: true, completeness });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, ok: false });
      });

    return () => {
      cancelled = true;
    };
  }, [caseId, key]);

  // Hasil untuk kunci lama berarti permintaan baru masih berjalan.
  if (result === null || result.key !== key) return { status: "loading", reload };
  return result.ok
    ? { status: "ready", completeness: result.completeness, reload }
    : { status: "error", reload };
}
