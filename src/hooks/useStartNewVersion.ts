"use client";

import type { CaseRead } from "@/types/case";

export function useStartNewVersion(caseId: string, onStarted: (draft: CaseRead) => void) {
  void caseId;
  void onStarted;
  return { start: async () => {}, pending: false, error: null as string | null };
}
