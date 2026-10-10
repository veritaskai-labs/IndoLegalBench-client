import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";

/** Server hanya menerima PUT untuk status ini; status lain terkunci. */
const EDITABLE_STATUSES: readonly CaseStatus[] = ["draft", "needs_revision"];

/** Form hanya bisa diedit untuk draf dan perlu revisi. */
export function isCaseEditable(status: CaseStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Tombol "Edit (buat versi baru)" hanya untuk kasus yang disetujui, dan hanya untuk admin
 * atau author yang membuat kasusnya, sama dengan aturan server. Ini hanya menentukan
 * tampilan tombol; server tetap yang memutuskan boleh atau tidak.
 */
export function canStartNewVersion(role: Role | null, status: CaseStatus, isCreator: boolean): boolean {
  if (status !== "approved" || role === null) return false;
  return role === "admin" || (role === "author" && isCreator);
}
