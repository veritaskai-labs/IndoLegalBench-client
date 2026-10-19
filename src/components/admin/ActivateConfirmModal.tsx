"use client";

import { MemberConfirmModal, type MemberConfirmModalProps } from "./MemberConfirmModal";

export function ActivateConfirmModal(props: Readonly<MemberConfirmModalProps>) {
  return (
    <MemberConfirmModal
      {...props}
      title="Aktifkan kembali akun ini?"
      questionBefore="Akun "
      questionAfter=" akan dapat masuk kembali."
      note="Peran akun tetap seperti sebelum dinonaktifkan. Penugasan reviewer yang dibatalkan saat penonaktifan tidak dipulihkan; tugaskan ulang dari halaman pemantauan review bila perlu."
      confirmLabel="Aktifkan"
      failureMessage="Gagal mengaktifkan kembali akun."
      confirmClassName="bg-indigo-600 hover:bg-indigo-700"
    />
  );
}
