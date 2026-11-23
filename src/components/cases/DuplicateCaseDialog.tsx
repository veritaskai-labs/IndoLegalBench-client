"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/apiClient";
import { duplicateCase } from "@/lib/cases/caseApi";
import type { CaseDirectoryRow } from "@/lib/cases/caseDirectory";

function duplicateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "SUITE_NOT_ACTIVE") return "Suite kasus ini diarsipkan. Aktifkan suite untuk menduplikasi kasus.";
    if (error.status === 404) return "Kasus asal tidak ditemukan.";
    if (error.status === 403) return "Anda tidak memiliki izin untuk menduplikasi kasus ini.";
    if (error.code === "CASE_CODE_TAKEN") return "Kode salinan baru saja digunakan. Coba lagi.";
  }
  return "Gagal mengonfirmasi salinan. Periksa daftar kasus sebelum mencoba lagi.";
}

export function DuplicateCaseDialog({ row, onClose, onDone }: Readonly<{
  row: CaseDirectoryRow;
  onClose: (afterError: boolean) => void;
  onDone: (id: string) => void;
}>) {
  return (
    <ConfirmDialog
      title="Duplikat kasus"
      confirmLabel="Duplikat"
      busyLabel="Menduplikasi…"
      onConfirm={() => duplicateCase(row.item.id)}
      errorMessage={duplicateErrorMessage}
      onDone={(created) => onDone(created.id)}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Versi yang berlaku dari <strong>{row.item.case_code}</strong> akan disalin ke suite <strong>{row.suite.name}</strong>.
        Salinan mendapat ID baru dan berstatus draft. Pilih tag dev/test sebelum mengajukan tinjauan.
      </p>
    </ConfirmDialog>
  );
}
