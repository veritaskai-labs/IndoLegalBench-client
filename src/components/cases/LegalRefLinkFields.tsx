"use client";

import { Controller, type Control, type UseFormRegister } from "react-hook-form";
import type { RegulationTypesResource } from "@/hooks/useRegulationTypes";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import { CASE_HELP, CASE_PLACEHOLDER } from "@/lib/cases/caseHelpText";
import { visibleLinkFields, type LinkExtraField, type LinkForm } from "@/lib/cases/legalRefForm";
import { TextField } from "./fields";
import { RegulationTypeSelect } from "./RegulationTypeSelect";
import type { ErrorLookup } from "./sections";

type Props = {
  refIndex: number;
  linkIndex: number;
  form: LinkForm;
  register: UseFormRegister<CaseFormValues>;
  control: Control<CaseFormValues>;
  errorFor: ErrorLookup;
  regulationTypes: RegulationTypesResource;
};

/** Label, bantuan, dan contoh isian tiap field tambahan. Opsional ditandai di label saja. */
const EXTRA_FIELDS: Record<LinkExtraField, { label: string; hint: string; placeholder: string }> = {
  pasal: { label: "Pasal", hint: CASE_HELP.pasal, placeholder: CASE_PLACEHOLDER.pasal },
  angka: { label: "Angka", hint: CASE_HELP.angka, placeholder: CASE_PLACEHOLDER.angka },
  ayat: { label: "Ayat (opsional)", hint: CASE_HELP.ayat, placeholder: CASE_PLACEHOLDER.ayat },
  huruf: {
    label: "Huruf (opsional)",
    hint: CASE_HELP.huruf,
    placeholder: CASE_PLACEHOLDER.huruf,
  },
};

/** Field satu peraturan di dalam rujukan. Field tambahan mengikuti bentuk link-nya. */
export function LegalRefLinkFields({
  refIndex,
  linkIndex,
  form,
  register,
  control,
  errorFor,
  regulationTypes,
}: Readonly<Props>) {
  const base = `legal_refs.${refIndex}.links.${linkIndex}` as const;
  const ready = regulationTypes.status === "ready";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <Controller
          control={control}
          name={`${base}.regulation_type`}
          render={({ field }) => (
            <RegulationTypeSelect
              label="Jenis peraturan"
              types={ready ? regulationTypes.types : []}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              hint={CASE_HELP.regulationType}
              placeholder={
                regulationTypes.status === "loading"
                  ? "Memuat jenis peraturan..."
                  : CASE_PLACEHOLDER.regulationType
              }
              disabled={!ready}
              error={errorFor(`${base}.regulation_type`)}
            />
          )}
        />
      </div>
      <TextField
        label="Nomor"
        hint={CASE_HELP.number}
        placeholder={CASE_PLACEHOLDER.number}
        registration={register(`${base}.number`)}
        error={errorFor(`${base}.number`)}
      />
      <TextField
        label="Tahun"
        type="number"
        hint={CASE_HELP.year}
        placeholder={CASE_PLACEHOLDER.year}
        registration={register(`${base}.year`)}
        error={errorFor(`${base}.year`)}
      />
      <TextField
        label="Tentang (opsional)"
        hint={CASE_HELP.about}
        placeholder={CASE_PLACEHOLDER.about}
        registration={register(`${base}.about`)}
        error={errorFor(`${base}.about`)}
      />
      {visibleLinkFields(form).map((name) => (
        <TextField
          key={name}
          label={EXTRA_FIELDS[name].label}
          hint={EXTRA_FIELDS[name].hint}
          placeholder={EXTRA_FIELDS[name].placeholder}
          registration={register(`${base}.${name}`)}
          error={errorFor(`${base}.${name}`)}
        />
      ))}
    </div>
  );
}
