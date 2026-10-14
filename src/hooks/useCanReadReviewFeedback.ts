"use client";

import { canReadReviewFeedback } from "@/lib/cases/permissions";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { useCreatorGatedPermission } from "./useCreatorGatedPermission";

/** Apakah catatan peninjau boleh tampil di halaman kasus: hanya pada kasus yang perlu revisi, untuk admin atau pembuatnya. */
export function useCanReadReviewFeedback(
  caseId: string,
  user: { id: string; role: Role } | null,
  status: CaseStatus | null,
): boolean {
  return useCreatorGatedPermission(caseId, user, status, "needs_revision", canReadReviewFeedback);
}
