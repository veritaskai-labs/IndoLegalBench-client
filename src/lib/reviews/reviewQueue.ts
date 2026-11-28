import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";

const REQUIRED_REVIEWERS = 2;

const REASONS = messages({
  id: {
    deactivated: "Reviewer dinonaktifkan",
    role_changed: "Peran reviewer diubah",
    unknown: "Reviewer tidak lagi bertugas",
    noneYet: "Belum ada reviewer",
    noneActive: "Tidak ada reviewer aktif",
    partial: "Baru {count} dari {required} reviewer",
    fallback: "Perlu penugasan ulang",
    unknownReviewer: "Reviewer tidak diketahui",
  },
  en: {
    deactivated: "Reviewer deactivated",
    role_changed: "Reviewer role changed",
    unknown: "Reviewer is no longer assigned",
    noneYet: "No reviewer yet",
    noneActive: "No active reviewer",
    partial: "Only {count} of {required} reviewers",
    fallback: "Needs reassignment",
    unknownReviewer: "Unknown reviewer",
  },
});

/** Kode void yang belum dikenal atau null memakai alasan netral (AC8). */
export function voidReason(assignment: ReassignmentAssignment, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(REASONS, locale);
  const reason = assignment.void_reason ?? "";
  if (reason === "deactivated" || reason === "role_changed") return copy[reason];
  return copy.unknown;
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
export function reassignmentReason(row: ReassignmentRow, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(REASONS, locale);
  const [firstVoid] = row.void_assignments;
  if (firstVoid) return voidReason(firstVoid, locale);
  if (row.round_status === "awaiting_assignment") return copy.noneYet;
  if (row.active_reviewers_count === 0) return copy.noneActive;
  if (row.active_reviewers_count < REQUIRED_REVIEWERS) {
    return fill(copy.partial, { count: row.active_reviewers_count, required: REQUIRED_REVIEWERS });
  }
  return copy.fallback;
}

/** reviewer_name boleh null di kontrak, jadi tabel tidak pernah menampilkan sel kosong. */
export function reviewerName(assignment: ReassignmentAssignment, locale: Locale = DEFAULT_LOCALE): string {
  return assignment.reviewer_name ?? text(REASONS, locale).unknownReviewer;
}
