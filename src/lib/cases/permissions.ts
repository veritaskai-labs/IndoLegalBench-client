import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";

/** Server hanya menerima PUT untuk status ini; status lain terkunci. */
const EDITABLE_STATUSES: readonly CaseStatus[] = ["draft", "needs_revision"];

/** Form hanya bisa diedit untuk draf dan perlu revisi. */
export function isCaseEditable(status: CaseStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/** Aturan server untuk aksi atas satu kasus: admin, atau author yang membuat kasusnya. null berarti belum ada sesi. */
export function isAdminOrCreator(role: Role | null, isCreator: boolean): boolean {
  return role === "admin" || (role === "author" && isCreator);
}

/**
 * Tombol "Edit (buat versi baru)" hanya untuk kasus yang disetujui, dan hanya untuk admin
 * atau author yang membuat kasusnya, sama dengan aturan server. Ini hanya menentukan
 * tampilan tombol; server tetap yang memutuskan boleh atau tidak.
 */
export function canStartNewVersion(role: Role | null, status: CaseStatus, isCreator: boolean): boolean {
  if (status !== "approved") return false;
  return isAdminOrCreator(role, isCreator);
}

/**
 * Catatan peninjau hanya tampil pada kasus yang perlu revisi, dan hanya untuk admin atau author
 * yang membuat kasusnya: server menjawab 403 untuk yang lain, dan setiap 403 memindahkan pengguna
 * ke /forbidden. Ini hanya menentukan tampilan; server tetap yang memutuskan boleh atau tidak.
 */
export function canReadReviewFeedback(role: Role | null, status: CaseStatus, isCreator: boolean): boolean {
  if (status !== "needs_revision") return false;
  return isAdminOrCreator(role, isCreator);
}
