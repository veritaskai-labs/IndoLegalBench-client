"use client";

import type { VersionSummary } from "@/types/caseVersion";

type CaseVersionsState =
  | { status: "loading" }
  | { status: "ready"; versions: VersionSummary[] }
  | { status: "error"; message: string };

type UseCaseVersions = CaseVersionsState & { reload: () => void };

export function useCaseVersions(caseId: string): UseCaseVersions {
  void caseId;
  return { status: "loading", reload: () => {} };
}
