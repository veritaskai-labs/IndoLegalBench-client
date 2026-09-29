"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { getCase } from "@/lib/cases/caseApi";
import type { CaseRead } from "@/types/case";

type CaseDetailState =
  | { status: "loading" }
  | { status: "ready"; saved: CaseRead }
  | { status: "error"; notFound: boolean };

type UseCaseDetail = CaseDetailState & {
  reload: () => void;
  /** Ganti data dengan balasan PUT, tanpa GET ulang. */
  replace: (saved: CaseRead) => void;
};

/** Ambil satu kasus untuk halaman edit. */
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
        setState({ status: "error", notFound });
      });

    return () => {
      cancelled = true;
    };
  }, [caseId, nonce]);

  return { ...state, reload, replace };
}
