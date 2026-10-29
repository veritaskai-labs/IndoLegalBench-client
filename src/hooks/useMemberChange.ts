"use client";

/* eslint-disable @typescript-eslint/no-unused-vars -- kerangka untuk commit red, dihapus di commit green */

import type { Role } from "@/types";
import type { User } from "@/types/user-management";

/** Pemanggilan API yang dipakai hook; hook bergantung pada ini, bukan pada userApi langsung. */
export interface MemberChangeApi {
  changeUserRole(userId: string, role: Role, confirm?: boolean): Promise<User>;
  deactivateUser(userId: string, confirm?: boolean): Promise<User>;
}

/** Perubahan yang menunggu jawaban Admin karena anggota masih punya kasus menunggu penilaian. */
export type PendingMemberChange =
  | { kind: "role"; user: User; role: Role; count: number }
  | { kind: "deactivate"; user: User; count: number };

/** Kerangka: belum melakukan apa-apa, diisi di commit green. */
export function useMemberChange(_onChanged: (user: User) => void, _api?: MemberChangeApi) {
  return {
    pending: null as PendingMemberChange | null,
    error: null as string | null,
    changeRole: async (_user: User, _role: Role): Promise<void> => {},
    deactivate: async (_user: User): Promise<void> => {},
    confirmPending: async (): Promise<void> => {},
    cancelPending: (): void => {},
    clearError: (): void => {},
  };
}
