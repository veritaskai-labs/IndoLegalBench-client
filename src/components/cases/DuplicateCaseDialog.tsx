"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/apiClient";
import { duplicateCase } from "@/lib/cases/caseApi";
import type { CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";

const COPY = messages({
  id: {
    title: "Duplikat kasus",
    confirm: "Duplikat",
    busy: "Menduplikasi…",
    beforeCode: "Versi yang berlaku dari ",
    between: " akan disalin ke suite ",
    after: ". Salinan mendapat ID baru dan berstatus draft. Pilih tag dev/test sebelum mengajukan tinjauan.",
    archived: "Suite kasus ini diarsipkan. Aktifkan suite untuk menduplikasi kasus.",
    notFound: "Kasus asal tidak ditemukan.",
    forbidden: "Anda tidak memiliki izin untuk menduplikasi kasus ini.",
    taken: "Kode salinan baru saja digunakan. Coba lagi.",
    fallback: "Gagal mengonfirmasi salinan. Periksa daftar kasus sebelum mencoba lagi.",
  },
  en: {
    title: "Duplicate case",
    confirm: "Duplicate",
    busy: "Duplicating…",
    beforeCode: "The current version of ",
    between: " will be copied into suite ",
    after: ". The copy gets a new ID and stays a draft. Choose a dev/test tag before submitting it for review.",
    archived: "This case's suite is archived. Activate the suite to duplicate the case.",
    notFound: "The source case was not found.",
    forbidden: "You do not have permission to duplicate this case.",
    taken: "The copy's code was just taken. Try again.",
    fallback: "Could not confirm the copy. Check the case list before trying again.",
  },
});

export function duplicateErrorMessage(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(COPY, locale);
  if (error instanceof ApiError) {
    if (error.code === "SUITE_NOT_ACTIVE") return copy.archived;
    if (error.status === 404) return copy.notFound;
    if (error.status === 403) return copy.forbidden;
    if (error.code === "CASE_CODE_TAKEN") return copy.taken;
  }
  return copy.fallback;
}

export function DuplicateCaseDialog({ row, onClose, onDone }: Readonly<{
  row: CaseDirectoryRow;
  onClose: (afterError: boolean) => void;
  onDone: (id: string) => void;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      onConfirm={() => duplicateCase(row.id)}
      errorMessage={(error) => duplicateErrorMessage(error, locale)}
      onDone={(created) => onDone(created.id)}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        {copy.beforeCode}
        <strong>{row.case_code}</strong>
        {copy.between}
        <strong>{row.suite_name}</strong>
        {copy.after}
      </p>
    </ConfirmDialog>
  );
}
