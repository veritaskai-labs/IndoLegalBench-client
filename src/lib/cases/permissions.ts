import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";

/** Server hanya menerima PUT untuk status ini; status lain terkunci. */
const EDITABLE_STATUSES: readonly CaseStatus[] = ["draft", "needs_revision"];

/** Pembuat kasus atau admin boleh membuat versi baru; server yang memeriksa pembuatnya. */
const START_VERSION_ROLES: readonly Role[] = ["author", "admin"];

/** Form hanya bisa diedit untuk draf dan perlu revisi. */
export function isCaseEditable(status: CaseStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Tombol "Edit (buat versi baru)" hanya untuk kasus yang disetujui.
 * Ini hanya menentukan tampilan tombol; server tetap yang memutuskan boleh atau tidak.
 */
export function canStartNewVersion(role: Role | null, status: CaseStatus): boolean {
  return status === "approved" && role !== null && START_VERSION_ROLES.includes(role);
}
