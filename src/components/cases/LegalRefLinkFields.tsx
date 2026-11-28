"use client";

import { Controller, type Control, type UseFormRegister } from "react-hook-form";
import type { RegulationTypesResource } from "@/hooks/useRegulationTypes";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import { caseHelp, casePlaceholder } from "@/lib/cases/caseHelpText";
import { visibleLinkFields, type LinkExtraField, type LinkForm } from "@/lib/cases/legalRefForm";
import { messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
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

const LINK_COPY = messages({
  id: {
    regulationType: "Jenis peraturan",
    loadingTypes: "Memuat jenis peraturan...",
    number: "Nomor",
    year: "Tahun",
    about: "Tentang (opsional)",
    pasal: "Pasal",
    angka: "Angka",
    ayat: "Ayat (opsional)",
    huruf: "Huruf (opsional)",
  },
  en: {
    regulationType: "Regulation type",
    loadingTypes: "Loading regulation types...",
    number: "Number",
    year: "Year",
    about: "About (optional)",
    pasal: "Pasal",
    angka: "Angka",
    ayat: "Ayat (optional)",
    huruf: "Huruf (optional)",
  },
});

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
  const copy = useText(LINK_COPY);
  const locale = useLocale();
  const help = caseHelp(locale);
  const placeholder = casePlaceholder(locale);
  const extraFields: Record<LinkExtraField, { label: string; hint: string; placeholder: string }> = {
    pasal: { label: copy.pasal, hint: help.pasal, placeholder: placeholder.pasal },
    angka: { label: copy.angka, hint: help.angka, placeholder: placeholder.angka },
    ayat: { label: copy.ayat, hint: help.ayat, placeholder: placeholder.ayat },
    huruf: { label: copy.huruf, hint: help.huruf, placeholder: placeholder.huruf },
  };
  const base = `legal_refs.${refIndex}.links.${linkIndex}` as const;
  const ready = regulationTypes.status === "ready";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Controller
          control={control}
          name={`${base}.regulation_type`}
          render={({ field }) => (
            <RegulationTypeSelect
              label={copy.regulationType}
              types={ready ? regulationTypes.types : []}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              hint={help.regulationType}
              placeholder={
                regulationTypes.status === "loading" ? copy.loadingTypes : placeholder.regulationType
              }
              disabled={!ready}
              error={errorFor(`${base}.regulation_type`)}
            />
          )}
        />
      </div>
      <TextField
        label={copy.number}
        hint={help.number}
        placeholder={placeholder.number}
        registration={register(`${base}.number`)}
        error={errorFor(`${base}.number`)}
      />
      <TextField
        label={copy.year}
        type="number"
        hint={help.year}
        placeholder={placeholder.year}
        registration={register(`${base}.year`)}
        error={errorFor(`${base}.year`)}
      />
      <div className="sm:col-span-2">
        <TextField
          label={copy.about}
          hint={help.about}
          placeholder={placeholder.about}
          registration={register(`${base}.about`)}
          error={errorFor(`${base}.about`)}
        />
      </div>
      {visibleLinkFields(form).map((name) => (
        <TextField
          key={name}
          label={extraFields[name].label}
          hint={extraFields[name].hint}
          placeholder={extraFields[name].placeholder}
          registration={register(`${base}.${name}`)}
          error={errorFor(`${base}.${name}`)}
        />
      ))}
    </div>
  );
}
