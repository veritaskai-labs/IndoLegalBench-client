"use client";

import { canStartNewVersion } from "@/lib/cases/permissions";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { useCreatorGatedPermission } from "./useCreatorGatedPermission";

/** Apakah tombol "Edit (buat versi baru)" boleh tampil: hanya pada kasus yang disetujui, untuk admin atau pembuatnya. */
export function useCanStartNewVersion(
  caseId: string,
  user: { id: string; role: Role } | null,
  status: CaseStatus | null,
): boolean {
  return useCreatorGatedPermission(caseId, user, status, "approved", canStartNewVersion);
}
