import { activeAssignments } from "@/lib/reviews/reviewQueue";
import type { ReassignmentRow, ReviewerOption } from "@/types/reviewAdmin";
import type { User } from "@/types/user-management";

/**
 * Siapa yang boleh menggantikan reviewer pada satu ronde (AC7): akun reviewer yang masih
 * aktif, bukan penulis kasus, dan belum ditugaskan di ronde itu. Server tetap penjaga
 * terakhir — ini supaya admin tidak kena penolakan setelah mengisi alasan.
 *
 * authorId null berarti penulisnya belum diketahui; daftar tidak disembunyikan karena itu,
 * dan server masih menolak dengan CANNOT_ASSIGN_AUTHOR bila ternyata penulis yang dipilih.
 */
export function candidatesExcept(
  users: User[],
  takenReviewerIds: string[],
  authorId: string | null,
): ReviewerOption[] {
  const taken = new Set(takenReviewerIds);

  return users
    .filter(
      (user) =>
        user.role === "reviewer" &&
        user.is_active &&
        user.id !== authorId &&
        !taken.has(user.id),
    )
    .map((user) => ({ id: user.id, name: user.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "id"));
}

/** Bentuk yang dipakai tab antrean: yang terpakai adalah reviewer aktif di baris itu. */
export function reviewerCandidates(
  users: User[],
  row: ReassignmentRow,
  authorId: string | null,
): ReviewerOption[] {
  return candidatesExcept(
    users,
    activeAssignments(row).map((assignment) => assignment.reviewer_id),
    authorId,
  );
}