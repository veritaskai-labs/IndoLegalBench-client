import { apiFetch } from "@/lib/apiClient";
import type { RegulationType } from "@/types/regulationType";

/**
 * Termasuk jenis yang sudah dinonaktifkan: rujukan lama masih menyimpan kodenya dan butuh labelnya.
 * Dropdown yang menyaring jenis aktif untuk pilihan baru (lihat RegulationTypeSelect).
 */
const ALL_TYPES_PATH = "/regulation-types?include_inactive=true";

/**
 * GET /regulation-types. Daftar jenis peraturan resmi (JDIH BPK RI) untuk dropdown rujukan,
 * sudah diurutkan server menurut urutan resmi. Bisa dibuka semua peran yang sudah login.
 */
export function listRegulationTypes(): Promise<RegulationType[]> {
  return apiFetch<RegulationType[]>(ALL_TYPES_PATH);
}
