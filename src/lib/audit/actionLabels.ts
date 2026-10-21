/**
 * Label Indonesia untuk kode aksi audit (F-06, TC-31).
 *
 * Kode ditulis server sebagai `<entitas>.<kata kerja>` (katalog D6a,
 * app/modules/audit/trackers.py). Pembaca di luar tim tidak bisa membaca
 * kode itu, jadi tabel dan panel detail menampilkan labelnya.
 */
export const ACTION_LABEL: Readonly<Record<string, string>> = {
  "suite.created": "Suite dibuat",
  "suite.updated": "Suite diubah",
  "suite.deleted": "Suite dihapus",
  "suite.archived": "Suite diarsipkan",
  "suite.unarchived": "Suite dikeluarkan dari arsip",
  "suite.snapshot_created": "Snapshot suite dibuat",
  "case.created": "Kasus dibuat",
  "case.updated": "Kasus diubah",
  "case.version_created": "Versi kasus baru dibuat",
  "case.tag_changed": "Tag split kasus diubah",
  "case.submitted": "Kasus diajukan review",
  "case.approved": "Kasus disetujui",
  "case.revision_requested": "Kasus diminta revisi",
  "case.status_changed": "Status kasus diubah",
  "review.reviewer_assigned": "Reviewer ditugaskan",
  "review.reviewer_replaced": "Reviewer diganti",
  "review.assignment_voided": "Penugasan reviewer dibatalkan",
  "review.comment_replied": "Penulis membalas komentar peninjau",
  "review.verdict_submitted": "Penilaian reviewer dikirim",
  "review.approval_carried": "Persetujuan dibawa ke ronde berikutnya",
  "ai_product.registered": "Produk AI didaftarkan",
  "ai_product.updated": "Produk AI diubah",
  "ai_product.deleted": "Produk AI dihapus",
  "ai_product.activated": "Produk AI diaktifkan",
  "ai_product.deactivated": "Produk AI dinonaktifkan",
  "ai_product.credential_rotated": "Kredensial produk AI diganti",
  "user.added": "Pengguna ditambahkan",
  "user.role_changed": "Peran pengguna diubah",
  "user.activated": "Pengguna diaktifkan",
  "user.deactivated": "Pengguna dinonaktifkan",
};

/** Label Indonesia, atau kode aslinya kalau aksi belum dikenal client. */
export function auditActionLabel(action: string): string {
  // Object.hasOwn supaya "constructor" dan sejenisnya tidak terbaca sebagai label.
  return Object.hasOwn(ACTION_LABEL, action) ? ACTION_LABEL[action] : action;
}
