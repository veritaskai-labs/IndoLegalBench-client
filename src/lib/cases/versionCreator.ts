import type { VersionSummary } from "@/types/caseVersion";

const FIRST_VERSION = 1;

/**
 * Pembuat kasus adalah penulis versi 1: server mengisinya dari pembuat kasus saat kasus dibuat
 * dan saat data lama dipindahkan. CaseRead tidak memuat pembuatnya, jadi dibaca dari riwayat.
 */
export function isCaseCreator(versions: readonly VersionSummary[], userId: string): boolean {
  return versions.some((version) => version.version_no === FIRST_VERSION && version.author.id === userId);
}
