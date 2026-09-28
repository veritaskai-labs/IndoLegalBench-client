"use client";

import { useForm } from "react-hook-form";
import {
  emptyCaseFormValues,
  toCaseWritePayload,
  type CaseFormValues,
  type CaseWritePayload,
} from "@/lib/cases/caseFormMapping";
import {
  AnswerCriteriaSection,
  IdentitySection,
  LegalRefsSection,
  SplitTagSection,
  TrapsSection,
} from "./sections";

type Props = {
  /** Tanpa nilai berarti kasus baru. */
  defaultValues?: CaseFormValues;
  /** Page yang memutuskan POST atau PUT; form hanya menyerahkan payload. */
  onSubmit: (payload: CaseWritePayload) => void | Promise<void>;
};

export function CaseEditorForm({ defaultValues, onSubmit }: Props) {
  const { register, control, handleSubmit, formState } = useForm<CaseFormValues>({
    defaultValues: defaultValues ?? emptyCaseFormValues(),
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toCaseWritePayload(values)))}
      className="space-y-6"
    >
      <IdentitySection register={register} />
      <LegalRefsSection register={register} control={control} />
      <AnswerCriteriaSection register={register} />
      <TrapsSection register={register} control={control} />
      <SplitTagSection register={register} />

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
