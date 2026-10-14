"use client";

import { isCaseCreator } from "@/lib/cases/versionCreator";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import { useAsyncResource } from "./useAsyncResource";

const historyMessage = (error: unknown) => mapVersionError(error, "history");

/**
 * Apakah pengguna pembuat kasus ini. CaseRead tidak memuat pembuatnya, jadi dibaca dari riwayat
 * versi, dan itu hanya dilakukan bila needed: pemanggil yang sudah memutuskan tanpa jawaban ini
 * (misalnya admin) tidak membuat permintaan. Selama riwayat dimuat atau gagal dimuat hasilnya false,
 * dan server tetap yang memutuskan boleh atau tidak.
 */
export function useIsCaseCreator(caseId: string, userId: string, needed: boolean): boolean {
  const creator = useAsyncResource(
    `${caseId}|${userId}|${needed}`,
    () =>
      needed
        ? listCaseVersions(caseId).then((versions) => isCaseCreator(versions, userId))
        : Promise.resolve(false),
    historyMessage,
  );

  return creator.status === "ready" && creator.data;
}
