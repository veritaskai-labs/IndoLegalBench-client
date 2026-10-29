import type { Role } from "@/types";

/**
 * Peran yang bisa dipilih Admin untuk satu akun (PBI-24 AC1, SCRUM-184): satu daftar untuk pilihan peran,
 * formulir tambah pengguna, dan filter, supaya ketiganya tidak berbeda.
 */
export const ROLE_OPTIONS: readonly { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "contributor", label: "Kontributor" },
  { value: "viewer", label: "Viewer" },
  { value: "developer_ai", label: "Developer AI" },
];
