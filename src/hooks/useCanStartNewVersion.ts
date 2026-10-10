"use client";

import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";

export function useCanStartNewVersion(
  caseId: string,
  user: { id: string; role: Role } | null,
  status: CaseStatus | null,
): boolean {
  void caseId;
  void user;
  void status;
  return false;
}
