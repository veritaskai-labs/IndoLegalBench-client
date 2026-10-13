"use client";

import { listCaseVersions } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import type { VersionSummary } from "@/types/caseVersion";
import { useAsyncResource } from "./useAsyncResource";

const historyMessage = (error: unknown) => mapVersionError(error, "history");

/** Server mengirim nomor terkecil dulu; halaman ingin yang terbaru di atas. */
const newestFirst = (versions: VersionSummary[]) =>
  [...versions].sort((a, b) => b.version_no - a.version_no);

/** Riwayat versi satu kasus untuk tab "Riwayat versi". Daftar kosong tetap status ready. */
export function useCaseVersions(caseId: string) {
  const { reload, ...resource } = useAsyncResource(
    caseId,
    () => listCaseVersions(caseId).then(newestFirst),
    historyMessage,
  );

  if (resource.status === "ready") return { status: "ready" as const, versions: resource.data, reload };
  return { ...resource, reload };
}
