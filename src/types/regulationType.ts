/**
 * Satu jenis peraturan dari GET /regulation-types. Bentuknya mengikuti yang dijanjikan server
 * (PBI-21), diurutkan menurut urutan di server. Diganti dengan tipe hasil generate begitu
 * endpoint itu masuk ke kontrak.
 */
export interface RegulationType {
  /** Kode yang dikirim ke server, bukan label. Tidak pernah berubah. */
  code: string;
  label: string;
  /** Mis. "UU" atau "Permen". Banyak jenis tidak punya. */
  singkatan: string | null;
  is_active: boolean;
}
