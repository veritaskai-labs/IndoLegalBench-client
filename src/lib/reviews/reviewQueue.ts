const REQUIRED_REVIEWERS = 2;

import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";

type VoidLabels = { reason: string; replaceText: string };

/**
 * Teks per void_reason (AC8). Server hanya mengirim kode; teksnya milik FE.
 * Kode yang belum dikenal atau null (server #82 mengirim null untuk nilai
 * tak dikenal) jatuh ke teks netral, bukan menuduh "dinonaktifkan".
 */
const VOID_LABELS: Record<string, VoidLabels> = {
  deactivated: {
    reason: "Reviewer dinonaktifkan",
    replaceText: "Ganti reviewer nonaktif",
  },
  role_changed: {
    reason: "Peran reviewer diubah",
    replaceText: "Ganti reviewer (peran diubah)",
  },
};

const UNKNOWN_VOID_LABELS: VoidLabels = {
  reason: "Reviewer tidak lagi bertugas",
  replaceText: "Ganti reviewer",
};

function voidLabels(assignment: ReassignmentAssignment): VoidLabels {
  return VOID_LABELS[assignment.void_reason ?? ""] ?? UNKNOWN_VOID_LABELS;
}

/** Teks tombol ganti untuk penugasan void, mengikuti alasan void-nya. */
export function voidedReplaceText(assignment: ReassignmentAssignment): string {
  return voidLabels(assignment).replaceText;
}

/** Penugasan yang masih berlaku. Hanya ini yang boleh diganti (AC7). */
export function activeAssignments(
  row: ReassignmentRow,
): ReassignmentAssignment[] {
  return row.assignments.filter((item) => item.status === "active");
}

/**
 * Kenapa baris ini masuk antrean (AC8). Server yang menentukan isi antrean,
 * fungsi ini hanya menamai alasannya untuk admin. Urutannya dari yang paling
 * informatif: reviewer yang hilang dulu, baru kekurangan jumlahnya. Bila
 * beberapa penugasan void beralasan beda, alasan penugasan void pertama dipakai.
 */
export function reassignmentReason(row: ReassignmentRow): string {
  const [firstVoid] = row.void_assignments;
  if (firstVoid) return voidLabels(firstVoid).reason;
  if (row.round_status === "awaiting_assignment") return "Belum ada reviewer";
  if (row.active_reviewers_count === 0) return "Tidak ada reviewer aktif";
  if (row.active_reviewers_count < REQUIRED_REVIEWERS) {
    return `Baru ${row.active_reviewers_count} dari ${REQUIRED_REVIEWERS} reviewer`;
  }
  return "Perlu penugasan ulang";
}

/** reviewer_name boleh null di kontrak, jadi tabel tidak pernah menampilkan sel kosong. */
export function reviewerName(assignment: ReassignmentAssignment): string {
  return assignment.reviewer_name ?? "Reviewer tidak diketahui";
}