"use client";

import { useCallback } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { startCaseVersion } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import type { CaseRead } from "@/types/case";
import { useAsyncAction } from "./useAsyncAction";

/**
 * Membuat versi baru dari kasus yang disetujui. Draf yang dikembalikan server
 * diserahkan ke onStarted, karena halaman harus mengisi form dari draf itu,
 * bukan dari GET kasus yang masih mengembalikan versi yang disetujui.
 */
export function useStartNewVersion(caseId: string, onStarted: (draft: CaseRead) => void) {
  const locale = useLocale();
  const action = useCallback(() => startCaseVersion(caseId), [caseId]);
  const forkMessage = useCallback(
    (error: unknown) => mapVersionError(error, "fork", locale),
    [locale],
  );
  const { run, pending, error } = useAsyncAction(action, onStarted, forkMessage);
  return { start: run, pending, error };
}
