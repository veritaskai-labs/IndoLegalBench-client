"use client";

import { canSubmitForReview } from "@/lib/cases/permissions";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import { isCaseCreator } from "@/lib/cases/versionCreator";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { useAsyncResource } from "./useAsyncResource";

const historyMessage = (error: unknown) => mapVersionError(error, "history");

/**
 * Apakah tombol "Ajukan review" boleh tampil. Hanya author pada kasus yang masih bisa diajukan
 * yang perlu riwayat untuk tahu apakah dia pembuatnya; peran lain diputuskan tanpa permintaan.
 * Selama riwayat dimuat atau gagal dimuat tombol disembunyikan, dan server tetap yang memutuskan.
 */
export function useCanSubmitForReview(
  caseId: string,
  user: { id: string; role: Role } | null,
  status: CaseStatus | null,
): boolean {
  const userId = user?.id ?? "";
  const submittable = status === "draft" || status === "needs_revision";
  const needsCreatorCheck = user?.role === "author" && submittable;

  const creator = useAsyncResource(
    `${caseId}|${userId}|submit|${needsCreatorCheck}`,
    () =>
      needsCreatorCheck
        ? listCaseVersions(caseId).then((versions) =>
            isCaseCreator(versions, userId),
          )
        : Promise.resolve(false),
    historyMessage,
  );

  const isCreator = creator.status === "ready" && creator.data;
  return (
    user !== null &&
    status !== null &&
    canSubmitForReview(user.role, status, isCreator)
  );
}
