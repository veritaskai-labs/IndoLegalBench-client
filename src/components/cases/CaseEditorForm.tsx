"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  emptyCaseFormValues,
  toCaseWritePayload,
  type CaseFormValues,
  type CaseWritePayload,
} from "@/lib/cases/caseFormMapping";
import type { FieldSaveError } from "@/lib/cases/saveError";
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

function fieldMessage({ message, detail }: FieldSaveError): string {
  return detail === null ? message : `${message} (${detail})`;
}

export function CaseEditorForm({ defaultValues, onSubmit, onDirtyChange }: Props) {
  const { register, control, handleSubmit, formState, getFieldState, setError, clearErrors } =
    useForm<CaseFormValues>({
      defaultValues: defaultValues ?? emptyCaseFormValues(),
    });

  const { isDirty } = formState;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const errorFor: ErrorLookup = (path) => getFieldState(path, formState).error?.message;
  const sectionProps = { register, errorFor };

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
        // Error server lama berlaku untuk simpan sebelumnya; server menilai ulang tiap simpan.
        clearErrors();
        return submit(event);
      }}
      className="space-y-6"
    >
      <IdentitySection {...sectionProps} />
      <LegalRefsSection {...sectionProps} control={control} />
      <AnswerCriteriaSection {...sectionProps} />
      <TrapsSection {...sectionProps} control={control} />
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
