"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, TEST_CASE_HIDDEN } from "@/lib/apiClient";
import { getCase } from "@/lib/cases/caseApi";
import type { CaseRead } from "@/types/case";

type CaseDetailState =
  | { status: "loading" }
  | { status: "ready"; saved: CaseRead }
  | { status: "error"; notFound: boolean; hidden: boolean };

type UseCaseDetail = CaseDetailState & {
  reload: () => void;
  /** Ganti data dengan balasan PUT, tanpa GET ulang. */
  replace: (saved: CaseRead) => void;
};

/** Ambil satu kasus untuk halaman edit atau halaman baca Developer AI. */
export function useCaseDetail(caseId: string): UseCaseDetail {
  const [state, setState] = useState<CaseDetailState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  const replace = useCallback((saved: CaseRead) => {
    setState({ status: "ready", saved });
  }, []);

  useEffect(() => {
    let cancelled = false;

    getCase(caseId)
      .then((saved) => {
        if (!cancelled) setState({ status: "ready", saved });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const notFound = error instanceof ApiError && error.status === 404;
        // Kasus test untuk Developer AI: ada, tapi isinya tidak boleh dibuka.
        const hidden = error instanceof ApiError && error.code === TEST_CASE_HIDDEN;
        setState({ status: "error", notFound, hidden });
      });

    return () => {
      cancelled = true;
    };
  }, [caseId, nonce]);

  return { ...state, reload, replace };
}
