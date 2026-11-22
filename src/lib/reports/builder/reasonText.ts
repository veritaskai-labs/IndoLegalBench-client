/** Baris umum untuk kode yang belum dikenal halaman (misalnya kode baru dari server). */
export const GENERIC_REASON = "Sesi ini belum bisa dipakai di laporan. Hubungi Admin bila alasannya tidak jelas.";

/**
 * Kalimat untuk kode alasan di 409 REPORT_NOT_COMPARABLE, yang hanya mengirim kode. Kode sesi
 * memakai kalimat yang sama persis dengan server (comparison_rules `_PESAN_TIDAK_LAYAK`), supaya
 * alasan dari eligible-sessions dan dari 409 terbaca sama.
 */
const REASONS: ReadonlyMap<string, string> = new Map([
  ["NEED_AT_LEAST_TWO_PRODUCTS", "Pilih sesi dari minimal dua produk untuk dibandingkan."],
  ["DUPLICATE_PRODUCT", "Satu produk hanya boleh diwakili satu sesi dalam satu laporan."],
  ["SESSION_NOT_FINISHED", "Sesi ini belum selesai, jadi belum bisa menjadi dasar laporan."],
  ["SESSION_CANCELLED", "Sesi ini dibatalkan. Lanjutkan sampai selesai dulu sebelum dipakai di laporan."],
  ["SESSION_RUN_FAILED", "Proses run sesi ini gagal. Perbaiki dulu, lalu run ulang."],
  ["SESSION_NOT_ACCEPTED_AS_IS", "Sesi ini selesai dengan kegagalan dan belum diterima apa adanya oleh Admin."],
  ["SESSION_NOT_GRADED", "Sesi ini belum dinilai, jadi belum punya skor untuk dilaporkan."],
]);

/** Kalimat untuk satu kode; kode yang tidak dikenal mendapat baris umum, tidak pernah kosong. */
export function reasonText(code: string): string {
  return REASONS.get(code) ?? GENERIC_REASON;
}
