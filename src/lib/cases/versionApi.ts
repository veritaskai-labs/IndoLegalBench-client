import type { CaseRead } from "@/types/case";
import type { VersionCompare, VersionSummary } from "@/types/caseVersion";

export function startCaseVersion(caseId: string): Promise<CaseRead> {
  void caseId;
  return Promise.resolve({} as CaseRead);
}

export function listCaseVersions(caseId: string): Promise<VersionSummary[]> {
  void caseId;
  return Promise.resolve([]);
}

export function compareCaseVersions(
  caseId: string,
  a: number,
  b: number,
): Promise<VersionCompare> {
  void caseId;
  void a;
  void b;
  return Promise.resolve({} as VersionCompare);
}
