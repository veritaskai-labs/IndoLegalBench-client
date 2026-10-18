"use client";

import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { useIsCaseCreator } from "./useIsCaseCreator";

type Rule = (role: Role | null, status: CaseStatus, isCreator: boolean) => boolean;

/**
 * Izin tampilan yang bergantung pada status kasus dan pada apakah pengguna pembuatnya. Riwayat versi
 * hanya dibaca untuk author pada status yang diminta (requiredStatus); admin dan peran lain, serta
 * status lain, diputuskan tanpa permintaan. Selama riwayat dimuat atau gagal dimuat hasilnya false,
 * dan server tetap yang memutuskan boleh atau tidak.
 */
export function useCreatorGatedPermission(
  caseId: string,
  user: { id: string; role: Role } | null,
  status: CaseStatus | null,
  requiredStatus: CaseStatus,
  rule: Rule,
): boolean {
  const needsCreatorCheck = user?.role === "author" && status === requiredStatus;
  const isCreator = useIsCaseCreator(caseId, user?.id ?? "", needsCreatorCheck);

  return user !== null && status !== null && rule(user.role, status, isCreator);
}
