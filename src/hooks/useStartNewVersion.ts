"use client";

import { useCallback, useRef, useState } from "react";
import { startCaseVersion } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import type { CaseRead } from "@/types/case";

/**
 * Membuat versi baru dari kasus yang disetujui. Draf yang dikembalikan server
 * diserahkan ke onStarted, karena halaman harus mengisi form dari draf itu,
 * bukan dari GET kasus yang masih mengembalikan versi yang disetujui.
 */
export function useStartNewVersion(caseId: string, onStarted: (draft: CaseRead) => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref, bukan state: klik kedua bisa masuk sebelum render ulang menonaktifkan tombol.
  const inFlight = useRef(false);

  const start = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      onStarted(await startCaseVersion(caseId));
    } catch (failure) {
      setError(mapVersionError(failure, "fork"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [caseId, onStarted]);

  return { start, pending, error };
}
