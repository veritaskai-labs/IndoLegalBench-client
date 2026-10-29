import { entityLabel } from "@/lib/audit/entityLabels";
import type { AuditEntityType, AuditEntry } from "@/types/audit";

/**
 * Aksi audit sebagai kalimat (K-07, TC-36): "Admin mengganti Reviewer", bukan "Reviewer diganti".
 *
 * Server mencatat pelaku sebagai orang yang mengirim request. Untuk akibat otomatis (kasus
 * disetujui setelah penilaian terakhir, reviewer dipilih sistem saat diajukan, dan sejenisnya)
 * orang itu bukan pelakunya, jadi kalimatnya pasif tanpa peran supaya tidak menyebut orang
 * untuk hal yang tidak ia lakukan.
 */

type Entry = Pick<AuditEntry, "action" | "actor_user_id" | "actor_role" | "after">;

const ROLE_SUBJECT: Readonly<Record<string, string>> = {
  contributor: "Kontributor",
  // Entri sebelum migrasi PBI-24 menyimpan peran saat itu, jadi dua nama lama tetap terbaca.
  author: "Author",
  reviewer: "Reviewer",
  admin: "Admin",
  viewer: "Viewer",
};

/** Kata kerja aktif setelah peran pelaku: "<Peran> <kata kerja>". */
const DONE_BY_ACTOR: Readonly<Record<string, string>> = {
  "suite.created": "membuat suite",
  "suite.updated": "mengubah suite",
  "suite.deleted": "menghapus suite",
  "suite.archived": "mengarsipkan suite",
  "suite.unarchived": "mengeluarkan suite dari arsip",
  "suite.snapshot_created": "membuat snapshot suite",
  "case.created": "membuat kasus",
  "case.updated": "mengubah kasus",
  "case.version_created": "membuat versi baru kasus",
  "case.tag_changed": "mengubah tag dev/test kasus",
  "case.submitted": "mengajukan kasus untuk review",
  "review.reviewer_replaced": "mengganti Reviewer",
  "review.comment_replied": "membalas diskusi review",
  "review.verdict_submitted": "mengirim penilaian",
  "ai_product.registered": "mendaftarkan produk AI",
  "ai_product.updated": "mengubah produk AI",
  "ai_product.deleted": "menghapus produk AI",
  "ai_product.activated": "mengaktifkan produk AI",
  "ai_product.deactivated": "menonaktifkan produk AI",
  "ai_product.credential_rotated": "mengganti kredensial produk AI",
  "user.added": "menambahkan pengguna",
  "user.role_changed": "mengubah peran pengguna",
  "user.activated": "mengaktifkan pengguna",
  "user.deactivated": "menonaktifkan pengguna",
};

/** Akibat otomatis, ditulis tanpa pelaku. */
const AUTOMATIC: Readonly<Record<string, string>> = {
  "case.approved": "Kasus disetujui",
  "case.revision_requested": "Kasus diminta revisi",
  "case.status_changed": "Status kasus berubah",
  "review.approval_carried": "Persetujuan Reviewer dibawa ke ronde berikutnya",
  "review.assignment_voided": "Penugasan Reviewer dibatalkan",
};

const ASSIGNED = "review.reviewer_assigned";

/** Semua kode aksi yang punya kalimat. Test menjaga daftar ini sama persis dengan katalog server. */
export const KNOWN_AUDIT_ACTIONS: readonly string[] = [
  ...Object.keys(DONE_BY_ACTOR),
  ...Object.keys(AUTOMATIC),
  ASSIGNED,
];

function subject(entry: Entry): string {
  if (entry.actor_user_id === null) return "Sistem";
  const role = entry.actor_role ?? "";
  return Object.hasOwn(ROLE_SUBJECT, role) ? ROLE_SUBJECT[role] : "Pengguna";
}

/** Reviewer dipilih Admin hanya bila server mencatat source admin; selain itu dipilih sistem. */
function assignedByAdmin(entry: Entry): boolean {
  return entry.after?.source === "admin";
}

/** Kalimat untuk kolom Aksi dan judul detail. Kode yang belum dikenal tampil apa adanya. */
export function auditActionSentence(entry: Entry): string {
  const { action } = entry;
  if (action === ASSIGNED) {
    return assignedByAdmin(entry) ? `${subject(entry)} menugaskan Reviewer` : "Reviewer ditugaskan otomatis";
  }
  // Object.hasOwn supaya "constructor" dan sejenisnya tidak terbaca sebagai aksi.
  if (Object.hasOwn(AUTOMATIC, action)) return AUTOMATIC[action];
  if (Object.hasOwn(DONE_BY_ACTOR, action)) return `${subject(entry)} ${DONE_BY_ACTOR[action]}`;
  return action;
}

/** Catatan ini menyangkut satu kasus, dan label dari server memang kode kasusnya. */
const ABOUT_A_CASE: ReadonlySet<string> = new Set<AuditEntityType>(["case", "case_version", "review"]);

/**
 * Isi kolom Objek: "Kasus ILB-PT-0142", "Suite Ketenagakerjaan 2026", "Pengguna Rina".
 * Tanpa nama (objek sudah tidak ada, atau server lama), id-nya yang tampil.
 */
export function auditObjectLabel(entry: Pick<AuditEntry, "entity_type" | "entity_id" | "entity_label">): string {
  return `${auditObjectNoun(entry.entity_type)} ${entry.entity_label ?? entry.entity_id}`;
}

/** Kata benda di depan nama objek. Catatan kasus, versi, dan review semuanya "Kasus". */
export function auditObjectNoun(type: string): string {
  return ABOUT_A_CASE.has(type) ? entityLabel("case") : entityLabel(type);
}
