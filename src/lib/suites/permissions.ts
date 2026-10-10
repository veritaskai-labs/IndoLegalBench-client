import type { Role } from "@/types";

/**
 * Tombol "Buat snapshot" hanya untuk Admin. Ini hanya menentukan tampilan;
 * server tetap yang menolak peran lain.
 */
export function canCreateSnapshot(role: Role | null): boolean {
  return role === "admin";
}
