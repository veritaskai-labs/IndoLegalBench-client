"use client";

import { useCallback, useEffect, useState } from "react";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import type { VersionSummary } from "@/types/caseVersion";

type CaseVersionsState =
  | { status: "loading" }
  | { status: "ready"; versions: VersionSummary[] }
  | { status: "error"; message: string };

type UseCaseVersions = CaseVersionsState & { reload: () => void };

/** Riwayat versi satu kasus untuk tab "Riwayat versi". Daftar kosong tetap status ready. */
export function useCaseVersions(caseId: string): UseCaseVersions {
  const [state, setState] = useState<CaseVersionsState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    listCaseVersions(caseId)
      .then((versions) => {
        if (!cancelled) setState({ status: "ready", versions });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: mapVersionError(error, "history") });
      });

    return () => {
      cancelled = true;
    };
  }, [caseId, nonce]);

  return { ...state, reload };
}
