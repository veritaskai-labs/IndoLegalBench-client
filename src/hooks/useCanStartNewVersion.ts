"use client";

import { canStartNewVersion } from "@/lib/cases/permissions";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { useIsCaseCreator } from "./useIsCaseCreator";

/**
 * Apakah tombol "Edit (buat versi baru)" boleh tampil. Hanya author pada kasus yang disetujui yang
 * perlu riwayat untuk tahu apakah dia pembuatnya; admin dan peran lain diputuskan tanpa permintaan.
 * Selama riwayat dimuat atau gagal dimuat tombol disembunyikan, dan server tetap yang memutuskan.
 */
export function useCanStartNewVersion(
  caseId: string,
  user: { id: string; role: Role } | null,
  status: CaseStatus | null,
): boolean {
  const needsCreatorCheck = user?.role === "author" && status === "approved";
  const isCreator = useIsCaseCreator(caseId, user?.id ?? "", needsCreatorCheck);

  return user !== null && status !== null && canStartNewVersion(user.role, status, isCreator);
}
