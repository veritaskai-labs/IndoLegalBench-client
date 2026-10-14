"use client";

import { canReadReviewFeedback } from "@/lib/cases/permissions";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { useIsCaseCreator } from "./useIsCaseCreator";

/**
 * Apakah catatan peninjau boleh tampil di halaman kasus. Hanya author pada kasus yang perlu revisi
 * yang membutuhkan riwayat untuk tahu apakah dia pembuatnya; admin dan peran lain diputuskan tanpa
 * permintaan. Selama riwayat dimuat atau gagal dimuat catatan disembunyikan, dan server tetap yang memutuskan.
 */
export function useCanReadReviewFeedback(
  caseId: string,
  user: { id: string; role: Role } | null,
  status: CaseStatus | null,
): boolean {
  const needsCreatorCheck = user?.role === "author" && status === "needs_revision";
  const isCreator = useIsCaseCreator(caseId, user?.id ?? "", needsCreatorCheck);

  return user !== null && status !== null && canReadReviewFeedback(user.role, status, isCreator);
}
