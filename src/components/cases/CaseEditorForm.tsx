"use client";

import { useEffect, useRef } from "react";
import { get, useForm } from "react-hook-form";
import {
  emptyCaseFormValues,
  toCaseWritePayload,
  type CaseFormValues,
  type CaseWritePayload,
} from "@/lib/cases/caseFormMapping";
import { caseFormResolver, flattenErrors } from "@/lib/cases/caseValidation";
import type { FieldSaveError } from "@/lib/cases/saveError";
import { ErrorSummary } from "./ErrorSummary";
import {
  AnswerCriteriaSection,
  IdentitySection,
  LegalRefsSection,
  SplitTagSection,
  TrapsSection,
  type ErrorLookup,
} from "./sections";

type Props = {
  /** Tanpa nilai berarti kasus baru. */
  defaultValues?: CaseFormValues;
  /**
   * Page yang memutuskan POST atau PUT; form hanya menyerahkan payload.
   * Bila server menolak satu field, page mengembalikan error itu agar form menempelkannya.
   */
  onSubmit: (payload: CaseWritePayload) => void | Promise<FieldSaveError | null | void>;
  /** Dipanggil saat form berubah dari bersih ke berisi perubahan, atau sebaliknya. */
  onDirtyChange?: (dirty: boolean) => void;
};

/** Jeda validasi saat mengetik, supaya error tidak berkedip di tiap ketukan. */
export const VALIDATE_DELAY_MS = 300;

function fieldMessage({ message, detail }: FieldSaveError): string {
  return detail === null ? message : `${message} (${detail})`;
}

export function CaseEditorForm({ defaultValues, onSubmit, onDirtyChange }: Props) {
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
    // Aturan dari contract (gen:zod). Jebakan dan kriteria tidak wajib, jadi draf tetap bisa disimpan.
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
        { type: "server", message: fieldMessage(fieldError) },
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
      <IdentitySection {...sectionProps} />
      <LegalRefsSection {...sectionProps} control={control} rowHasError={rowHasError} />
      <AnswerCriteriaSection {...sectionProps} />
      <TrapsSection {...sectionProps} control={control} rowHasError={rowHasError} />
      <SplitTagSection {...sectionProps} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Simpan draf
        </button>
      </div>
    </form>
  );
}
