import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";

/** Server hanya menerima PUT untuk status ini; status lain terkunci. */
const EDITABLE_STATUSES: readonly CaseStatus[] = ["draft", "needs_revision"];
const SUBMITTABLE_STATUSES: readonly CaseStatus[] = ["draft", "needs_revision"];

/** Form hanya bisa diedit untuk draf dan perlu revisi. */
export function isCaseEditable(status: CaseStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/** Peran yang boleh memulai kasus baru: Kontributor (hak penulis sebelumnya) dan admin. null berarti belum ada sesi. */
export function canCreateCase(role: Role | null): boolean {
  return role === "contributor" || role === "admin";
}

/** Aturan server untuk aksi atas satu kasus: admin, atau Kontributor yang membuat kasusnya. null berarti belum ada sesi. */
export function isAdminOrCreator(role: Role | null, isCreator: boolean): boolean {
  return role === "admin" || (role === "contributor" && isCreator);
}

/**
 * Tombol "Edit (buat versi baru)" hanya untuk kasus yang disetujui, dan hanya untuk admin
 * atau Kontributor yang membuat kasusnya, sama dengan aturan server. Ini hanya menentukan
 * tampilan tombol; server tetap yang memutuskan boleh atau tidak.
 */
export function canStartNewVersion(role: Role | null, status: CaseStatus, isCreator: boolean): boolean {
  if (status !== "approved") return false;
  return isAdminOrCreator(role, isCreator);
}

/**
 * Catatan peninjau hanya tampil pada kasus yang perlu revisi, dan hanya untuk admin atau Kontributor
 * yang membuat kasusnya: server menjawab 403 untuk yang lain, dan setiap 403 memindahkan pengguna
 * ke /forbidden. Ini hanya menentukan tampilan; server tetap yang memutuskan boleh atau tidak.
 */
export function canReadReviewFeedback(role: Role | null, status: CaseStatus, isCreator: boolean): boolean {
  if (status !== "needs_revision") return false;
  return isAdminOrCreator(role, isCreator);
}

export function canSubmitForReview(
  role: Role | null,
  status: CaseStatus,
  isCreator: boolean,
): boolean {
  if (role === null || !SUBMITTABLE_STATUSES.includes(status)) return false;
  return role === "contributor" && isCreator;
}
