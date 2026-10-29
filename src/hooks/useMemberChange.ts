"use client";

import { useRef, useState } from "react";
import { adminErrorMessage } from "@/components/admin/errorMessage";
import { changeUserRole, confirmationCount, deactivateUser } from "@/lib/userApi";
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

const DEFAULT_API: MemberChangeApi = { changeUserRole, deactivateUser };
const ROLE_FAILED = "Gagal mengubah peran pengguna.";
const DEACTIVATE_FAILED = "Gagal menonaktifkan akun.";

/**
 * Alur ubah peran dan nonaktifkan anggota dengan konfirmasi (PBI-24 AC8). Permintaan pertama
 * dikirim tanpa confirm; bila server menjawab 409 CONFIRMATION_REQUIRED, perubahan ditahan di
 * `pending` bersama jumlah kasusnya dan tidak ada yang tersimpan. Hanya setelah Admin setuju
 * (confirmPending) permintaan yang sama dikirim lagi dengan confirm=true.
 */
export function useMemberChange(
  onChanged: (user: User) => void,
  api: MemberChangeApi = DEFAULT_API,
) {
  const [pending, setPending] = useState<PendingMemberChange | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref, bukan state: klik kedua bisa masuk sebelum render ulang menonaktifkan tombol.
  // Satu penjaga untuk semua permintaan, jadi dua permintaan tidak pernah berlomba.
  const inFlight = useRef(false);

  const changeRole = async (user: User, role: Role): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      onChanged(await api.changeUserRole(user.id, role));
    } catch (failure) {
      const count = confirmationCount(failure);
      if (count === null) setError(adminErrorMessage(failure, ROLE_FAILED));
      else setPending({ kind: "role", user, role, count });
    } finally {
      inFlight.current = false;
    }
  };

  /** Kegagalan selain konfirmasi dilempar lagi, supaya dialog nonaktifkan menampilkannya sendiri. */
  const deactivate = async (user: User): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      onChanged(await api.deactivateUser(user.id));
    } catch (failure) {
      const count = confirmationCount(failure);
      if (count === null) throw failure;
      setPending({ kind: "deactivate", user, count });
    } finally {
      inFlight.current = false;
    }
  };

  const confirmPending = async (): Promise<void> => {
    if (pending === null || inFlight.current) return;
    inFlight.current = true;
    try {
      const updated =
        pending.kind === "role"
          ? await api.changeUserRole(pending.user.id, pending.role, true)
          : await api.deactivateUser(pending.user.id, true);
      setPending(null);
      onChanged(updated);
    } catch (failure) {
      // Server saat ini tidak menjawab 409 lagi bila confirm=true: ia melepas semua kasus yang
      // menunggu saat itu tanpa bertanya. Cabang ini hanya berjaga bila kontraknya berubah.
      const count = confirmationCount(failure);
      if (count !== null) {
        setPending({ ...pending, count });
      } else {
        setPending(null);
        setError(adminErrorMessage(failure, pending.kind === "role" ? ROLE_FAILED : DEACTIVATE_FAILED));
      }
    } finally {
      inFlight.current = false;
    }
  };

  return {
    pending,
    error,
    changeRole,
    deactivate,
    confirmPending,
    cancelPending: () => setPending(null),
    clearError: () => setError(null),
  };
}
