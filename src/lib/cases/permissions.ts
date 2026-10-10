import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";

export function isCaseEditable(status: CaseStatus): boolean {
  void status;
  return true;
}

export function canStartNewVersion(role: Role | null, status: CaseStatus): boolean {
  void role;
  void status;
  return false;
}
