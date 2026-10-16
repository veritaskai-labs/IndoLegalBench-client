import { apiFetch } from "@/lib/apiClient";
import type { RegulationType } from "@/types/regulationType";

/** Hanya jenis yang aktif: jenis yang sudah dinonaktifkan tidak boleh dipilih untuk link baru. */
const ACTIVE_TYPES_PATH = "/regulation-types?include_inactive=false";

/**
 * GET /regulation-types. Daftar jenis peraturan resmi (JDIH BPK RI) untuk dropdown rujukan,
 * sudah diurutkan server menurut urutan resmi. Bisa dibuka semua peran yang sudah login.
 */
export function listRegulationTypes(): Promise<RegulationType[]> {
  return apiFetch<RegulationType[]>(ACTIVE_TYPES_PATH);
}
