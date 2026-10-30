import { ApiError, apiFetch } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { User } from "@/types/user-management";

const CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED";

/** Path anggota; confirm=true hanya dikirim setelah Admin menyetujui dialog (PBI-24 AC8). */
function memberPath(userId: string, suffix: string, confirm: boolean): string {
  const query = confirm ? "?confirm=true" : "";
  return `/admin/users/${encodeURIComponent(userId)}${suffix}${query}`;
}

/**
 * GET /admin/users?is_active=true. Admin saja.
 * Dipakai untuk kandidat reviewer di halaman pemantauan review (SCRUM-150).
 * Halaman anggota masih punya pemanggil sendiri di dalam page.tsx-nya.
 */
export function listActiveUsers(): Promise<User[]> {
  return apiFetch<User[]>("/admin/users?is_active=true");
}

/**
 * POST /admin/users/{id}/activate. Admin saja.
 * Membatalkan penonaktifan (Pre-UAT F-08). Penugasan reviewer yang
 * dibatalkan saat penonaktifan tidak dipulihkan.
 */
export function activateUser(userId: string): Promise<User> {
  return apiFetch<User>(`/admin/users/${encodeURIComponent(userId)}/activate`, {
    method: "POST",
  });
}

/**
 * PATCH /admin/users/{id}. Admin saja.
 * Bila anggota masih punya kasus menunggu penilaian, tanpa confirm server menjawab 409
 * CONFIRMATION_REQUIRED dan tidak mengubah apa pun; kirim ulang dengan confirm=true.
 */
export function changeUserRole(userId: string, role: Role, confirm = false): Promise<User> {
  return apiFetch<User>(memberPath(userId, "", confirm), {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

/** POST /admin/users/{id}/deactivate. Admin saja. Aturan confirm sama dengan changeUserRole. */
export function deactivateUser(userId: string, confirm = false): Promise<User> {
  return apiFetch<User>(memberPath(userId, "/deactivate", confirm), {
    method: "POST",
  });
}

/**
 * Jumlah kasus yang menunggu bila error ini berarti "minta konfirmasi Admin dulu", selain itu null.
 * 409 tanpa jumlah juga null: tidak ada angka yang jujur untuk ditampilkan di dialog.
 */
export function confirmationCount(error: unknown): number | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status !== 409 || error.code !== CONFIRMATION_REQUIRED) return null;
  return error.affectedCount;
}
