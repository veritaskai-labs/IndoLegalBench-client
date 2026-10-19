"use client";

import { MemberConfirmModal, type MemberConfirmModalProps } from "./MemberConfirmModal";

export function DeactivateConfirmModal(props: Readonly<MemberConfirmModalProps>) {
  return (
    <MemberConfirmModal
      {...props}
      title="Nonaktifkan Pengguna?"
      questionBefore="Apakah Anda yakin ingin menonaktifkan akun "
      questionAfter="?"
      note="Akun tidak akan dapat masuk kembali dan seluruh sesi aktifnya akan dihapus. Riwayat kontribusi kasus dan tinjauan tetap tercatat atas nama pengguna ini."
      confirmLabel="Nonaktifkan"
      failureMessage="Gagal menonaktifkan akun."
      confirmClassName="bg-red-600 hover:bg-red-700"
    />
  );
}
