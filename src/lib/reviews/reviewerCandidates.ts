import { activeAssignments } from "@/lib/reviews/reviewQueue";
import type { ReassignmentRow, ReviewerOption } from "@/types/reviewAdmin";
import type { User } from "@/types/user-management";

/**
 * Siapa yang boleh menggantikan reviewer pada satu ronde: akun reviewer yang masih aktif
 * dan belum ditugaskan di ronde itu.
 *
 * Penulis kasus belum bisa dikecualikan di sini karena antrean dari server belum
 * membawa field author. Kalau terpilih, server menolak dengan REVIEWER_IS_AUTHOR dan
 * pesannya sudah ada di replaceErrors.ts.
 */
export function reviewerCandidates(
  users: User[],
  row: ReassignmentRow,
): ReviewerOption[] {
  const taken = new Set(
    activeAssignments(row).map((assignment) => assignment.reviewer_id),
  );

  return users
    .filter(
      (user) =>
        user.role === "reviewer" && user.is_active && !taken.has(user.id),
    )
    .map((user) => ({ id: user.id, name: user.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "id"));
}