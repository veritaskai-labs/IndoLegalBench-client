"use client";

import type { PendingMemberChange } from "@/hooks/useMemberChange";
import { confirmationQuestion } from "./errorMessage";
import { MemberConfirmModal } from "./MemberConfirmModal";

interface Props {
  pending: PendingMemberChange | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Pertanyaan kedua saat anggota masih punya kasus menunggu penilaian (PBI-24 AC8, D11).
 * Dibuka dan ditutup oleh `pending`, bukan oleh dialog ini: setelah Lanjutkan, hook-lah yang
 * memutuskan dialog tertutup atau tampil lagi dengan jumlah terbaru.
 */
export function PendingReviewsModal({ pending, onConfirm, onCancel }: Readonly<Props>) {
  return (
    <MemberConfirmModal
      user={pending?.user ?? null}
      isOpen={pending !== null}
      onClose={onCancel}
      onConfirm={onConfirm}
      closeAfterConfirm={false}
      title="Kasus menunggu penilaian"
      questionBefore="Akun "
      questionAfter=" masih memiliki kasus yang menunggu penilaian."
      note={pending === null ? "" : confirmationQuestion(pending.count)}
      confirmLabel="Lanjutkan"
      failureMessage="Gagal menyimpan perubahan."
      confirmClassName="bg-indigo-600 hover:bg-indigo-700"
    />
  );
}
