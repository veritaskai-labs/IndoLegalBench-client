const REQUIRED_REVIEWERS = 2;

import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";

/** Penugasan yang masih berlaku. Hanya ini yang boleh diganti (AC7). */
export function activeAssignments(
  row: ReassignmentRow,
): ReassignmentAssignment[] {
  return row.assignments.filter((item) => item.status === "active");
}

/**
 * Kenapa baris ini masuk antrean (AC8). Server yang menentukan isi antrean,
 * fungsi ini hanya menamai alasannya untuk admin. Urutannya dari yang paling
 * informatif: reviewer yang hilang dulu, baru kekurangan jumlahnya.
 */
export function reassignmentReason(row: ReassignmentRow): string {
  if (row.void_assignments.length > 0) return "Reviewer dinonaktifkan";
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