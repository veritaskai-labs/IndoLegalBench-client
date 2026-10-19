import { apiFetch } from "@/lib/apiClient";
import type { User } from "@/types/user-management";

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
