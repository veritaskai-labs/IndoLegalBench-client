"use client";

import { useEffect, useRef } from "react";
import { get, useForm } from "react-hook-form";
import { useLegalRefPreview } from "@/hooks/useLegalRefPreview";
import { useRegulationTypes } from "@/hooks/useRegulationTypes";
import {
  emptyCaseFormValues,
  toCaseWritePayload,
  type CaseFormValues,
  type CaseWritePayload,
} from "@/lib/cases/caseFormMapping";
import { caseFormResolver, flattenErrors } from "@/lib/cases/caseValidation";
import { fieldErrorText, type FieldSaveError } from "@/lib/cases/saveError";
import type { SplitTag } from "@/types/case";
import { ErrorSummary } from "./ErrorSummary";
import { LegalRefsSection } from "./LegalRefsSection";
import {
  AnswerCriteriaSection,
  IdentitySection,
  SplitTagSection,
  TrapsSection,
  type ErrorLookup,
} from "./sections";

type Props = {
  /** Tanpa nilai berarti kasus baru. */
  defaultValues?: CaseFormValues;
  /** Kasus yang sedang diedit, untuk pratinjau rujukan (SCRUM-162). Tanpa nilai untuk kasus baru. */
  caseId?: string;
  /**
   * Page yang memutuskan POST atau PUT; form hanya menyerahkan payload.
   * Bila server menolak satu field, page mengembalikan error itu agar form menempelkannya.
   */
  onSubmit: (payload: CaseWritePayload) => void | Promise<FieldSaveError | null | void>;
  /** Dipanggil saat form berubah dari bersih ke berisi perubahan, atau sebaliknya. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Versi terkunci: semua kolom dinonaktifkan dan tombol simpan disembunyikan. */
  readOnly?: boolean;
  /**
   * Kasus sudah pernah disetujui: tag hanya diubah Admin lewat dialog "Ubah tag" (PBI-9 AC3).
   * Pilihan tag diganti badge; nilainya tetap ikut terkirim dari defaultValues.
   */
  tagLocked?: boolean;
};

/** Tag tersimpan, atau null bila belum dipilih (nilai form kosong ""). */
function chosenTag(values: CaseFormValues | undefined): SplitTag | null {
  const tag = values?.split_tag;
  return tag === "dev" || tag === "test" ? tag : null;
}

/** Jeda validasi saat mengetik, supaya error tidak berkedip di tiap ketukan. */
export const VALIDATE_DELAY_MS = 300;

export function CaseEditorForm({
  defaultValues,
  caseId,
  onSubmit,
  onDirtyChange,
  readOnly = false,
  tagLocked = false,
}: Readonly<Props>) {
  const {
    register,
    control,
    handleSubmit,
    formState,
    getFieldState,
    setError,
    clearErrors,
    setFocus,
    subscribe,
    trigger,
  } = useForm<CaseFormValues>({
    defaultValues: defaultValues ?? emptyCaseFormValues(),
    // Aturan dari contract (gen:zod). Pengurang Poin dan kriteria tidak wajib, jadi draf tetap bisa disimpan.
    resolver: caseFormResolver,
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  // Validasi saat mengetik, hanya untuk field yang berubah, setelah jeda singkat.
  // Timer disimpan di ref supaya submit bisa membatalkannya.
  const validateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: ({ name, type }) => {
        // Hanya ketikan pengguna. Tambah baris kosong tidak boleh langsung memunculkan error.
        if (name === undefined || type !== "change") return;
        clearTimeout(validateTimer.current);
        validateTimer.current = setTimeout(
          () => void trigger(name as Parameters<typeof trigger>[0]),
          VALIDATE_DELAY_MS,
        );
      },
    });
    return () => {
      clearTimeout(validateTimer.current);
      unsubscribe();
    };
  }, [subscribe, trigger]);

  // Satu kali untuk seluruh bagian rujukan, bukan di tiap baris.
  const regulationTypes = useRegulationTypes();
  // Pratinjau dan error rujukan dari server saat mengetik; versi terkunci tidak perlu.
  const preview = useLegalRefPreview(control, caseId ?? null, !readOnly);

  const { isDirty } = formState;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const errorFor: ErrorLookup = (path) => getFieldState(path, formState).error?.message;
  const rowHasError = (row: string) => get(formState.errors, row) !== undefined;
  const sectionProps = { register, errorFor };
  // Ringkasan ikut tampil begitu ada error, sebelum Simpan ditekan (UAT TC_29).
  const summary = flattenErrors(formState.errors);

  const submit = handleSubmit(async (values) => {
    const fieldError = await onSubmit(toCaseWritePayload(values));
    if (fieldError) {
      setError(
        fieldError.path,
        { type: "server", message: fieldErrorText(fieldError) },
        { shouldFocus: true },
      );
    }
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        // Submit memvalidasi seluruh form. Validasi tertunda yang menyala sesudahnya
        // akan menghapus error dari server untuk field itu (SCRUM-131).
        clearTimeout(validateTimer.current);
        // Error server lama berlaku untuk simpan sebelumnya; server menilai ulang tiap simpan.
        clearErrors();
        return submit(event);
      }}
      className="space-y-6"
    >
      <ErrorSummary issues={summary} onSelect={(path) => setFocus(path)} />
      {/* fieldset disabled menonaktifkan semua kolom dan tombol tambah baris di dalamnya sekaligus. */}
      <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-6 border-0 p-0">
        <IdentitySection {...sectionProps} />
        <LegalRefsSection
          {...sectionProps}
          control={control}
          rowHasError={rowHasError}
          regulationTypes={regulationTypes}
          preview={preview}
        />
        <AnswerCriteriaSection {...sectionProps} />
        <TrapsSection {...sectionProps} control={control} rowHasError={rowHasError} />
        <SplitTagSection {...sectionProps} lockedTag={tagLocked ? chosenTag(defaultValues) : null} />
      </fieldset>

      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Simpan draf
          </button>
        </div>
      )}
    </form>
  );
}
