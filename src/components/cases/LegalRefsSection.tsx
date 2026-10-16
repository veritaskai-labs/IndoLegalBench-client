"use client";

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import type { RegulationTypesResource } from "@/hooks/useRegulationTypes";
import { emptyLegalRef } from "@/lib/cases/legalRefForm";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import { CASE_HELP } from "@/lib/cases/caseHelpText";
import { AddRowButton, FormSection } from "./fields";
import { LegalRefRow } from "./LegalRefRow";
import type { ErrorLookup } from "./sections";

type Props = {
  register: UseFormRegister<CaseFormValues>;
  control: Control<CaseFormValues>;
  errorFor: ErrorLookup;
  /** True bila ada error di dalam satu baris, misalnya `legal_refs.0`. */
  rowHasError: (row: `legal_refs.${number}`) => boolean;
  /** Daftar jenis dari useRegulationTypes. Dimuat sekali di sini, bukan di tiap baris. */
  regulationTypes: RegulationTypesResource;
};

/** Bagian rujukan hukum: satu atau lebih rujukan, tiap rujukan memilih bentuknya sendiri. */
export function LegalRefsSection({
  register,
  control,
  errorFor,
  rowHasError,
  regulationTypes,
}: Readonly<Props>) {
  const { fields, append, remove, update } = useFieldArray({ control, name: "legal_refs" });

  return (
    <FormSection title="Rujukan hukum" help={CASE_HELP.legalRefs} error={errorFor("legal_refs")}>
      {regulationTypes.status === "error" && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
          <p className="text-red-800">{regulationTypes.message}</p>
          <button
            type="button"
            onClick={regulationTypes.reload}
            className="mt-2 text-xs font-medium text-red-800 underline"
          >
            Coba lagi
          </button>
        </div>
      )}
      {fields.map((field, index) => (
        <LegalRefRow
          key={field.id}
          index={index}
          control={control}
          register={register}
          errorFor={errorFor}
          invalid={rowHasError(`legal_refs.${index}`)}
          regulationTypes={regulationTypes}
          onUpdate={(value) => update(index, value)}
          onRemove={() => remove(index)}
        />
      ))}
      <AddRowButton label="+ Tambah rujukan" onClick={() => append(emptyLegalRef())} />
    </FormSection>
  );
}
