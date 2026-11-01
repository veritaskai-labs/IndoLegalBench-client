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
 * Catatan peninjau dan thread-nya ditawarkan di semua status kasus kepada admin dan Kontributor: penulis
 * dan kedua reviewer semuanya Kontributor, dan klien tidak tahu siapa yang ditugaskan di kasus ini. Server
 * yang memutuskan; bila bukan pihak di kasus ini, bagiannya tidak tampil (lihat findCaseReview).
 * status null berarti kasus belum dimuat, role null berarti belum ada sesi.
 */
export function canReadReviewFeedback(role: Role | null, status: CaseStatus | null): boolean {
  return status !== null && (role === "admin" || role === "contributor");
}

export function canSubmitForReview(
  role: Role | null,
  status: CaseStatus,
  isCreator: boolean,
): boolean {
  if (role === null || !SUBMITTABLE_STATUSES.includes(status)) return false;
  return role === "contributor" && isCreator;
}
