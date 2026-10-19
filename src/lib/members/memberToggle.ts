import type { User } from "@/types/user-management";

export type MemberToggleAction = "deactivate" | "activate";

/**
 * Apa yang dilakukan saklar Aktif pada satu baris anggota.
 * Akun sendiri selalu terkunci (server menolak CANNOT_DEACTIVATE_SELF),
 * selain itu saklar membalik status aktif (Pre-UAT F-08).
 */
export function memberToggleAction(
  user: User,
  currentUserId: string | null,
): MemberToggleAction | null {
  if (user.id === currentUserId) return null;
  return user.is_active ? "deactivate" : "activate";
}

/** Ganti baris anggota dengan salinan dari server, urutan tetap. */
export function replaceMember(users: User[], updated: User): User[] {
  return users.map((user) => (user.id === updated.id ? updated : user));
}
