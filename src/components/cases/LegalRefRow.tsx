"use client";

import { useWatch, type Control, type UseFormRegister } from "react-hook-form";
import type { RegulationTypesResource } from "@/hooks/useRegulationTypes";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import { CASE_HELP, CASE_PLACEHOLDER } from "@/lib/cases/caseHelpText";
import {
  changeLinkForm,
  changeRefMode,
  LINK_FORM_OPTIONS,
  REF_MODE_OPTIONS,
  refMode,
  type LegalRefFormValues,
  type LinkForm,
  type RefMode,
} from "@/lib/cases/legalRefForm";
import { RowGroup, SelectField, TextAreaField } from "./fields";
import { LegalRefLinkFields } from "./LegalRefLinkFields";
import type { ErrorLookup } from "./sections";

type Props = {
  index: number;
  control: Control<CaseFormValues>;
  register: UseFormRegister<CaseFormValues>;
  errorFor: ErrorLookup;
  /** Baris ini berisi isian yang ditolak, supaya disorot. */
  invalid: boolean;
  regulationTypes: RegulationTypesResource;
  /** Ganti seluruh baris, mis. saat bentuknya berubah. Isian baris dipasang ulang. */
  onUpdate: (value: LegalRefFormValues) => void;
  onRemove: () => void;
};

const CONNECTOR_LABEL = { none: "", jo: "jo.", jis: "jis." } as const;

function isRefMode(value: string): value is RefMode {
  return REF_MODE_OPTIONS.some((option) => option.value === value);
}

function isLinkForm(value: string): value is LinkForm {
  return LINK_FORM_OPTIONS.some((option) => option.value === value);
}

/** Satu rujukan: pilihan bentuk, lalu field link-nya atau teks bebas. */
export function LegalRefRow({
  index,
  control,
  register,
  errorFor,
  invalid,
  regulationTypes,
  onUpdate,
  onRemove,
}: Readonly<Props>) {
  // Saat baris dihapus, satu render berlalu sebelum daftar ikut menyusut.
  const ref: LegalRefFormValues | undefined = useWatch({ control, name: `legal_refs.${index}` });
  if (ref === undefined) return null;

  return (
    <RowGroup
      title={`Rujukan ${index + 1}`}
      removeLabel={`Hapus rujukan ${index + 1}`}
      onRemove={onRemove}
      invalid={invalid}
    >
      <SelectField
        label="Bentuk rujukan"
        hint={CASE_HELP.refForm}
        value={refMode(ref)}
        options={REF_MODE_OPTIONS}
        // Kesalahan struktur rujukan (bentuk atau daftar link) tidak punya kolom sendiri.
        error={errorFor(`legal_refs.${index}.kind`) ?? errorFor(`legal_refs.${index}.links`)}
        onChange={(mode) => {
          if (isRefMode(mode)) onUpdate(changeRefMode(ref, mode));
        }}
      />
      {ref.kind === "free_text" ? (
        <div>
          <p className="mb-1">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Tidak terstruktur
            </span>
          </p>
          <TextAreaField
            label="Teks bebas"
            hint={CASE_HELP.freeText}
            placeholder={CASE_PLACEHOLDER.freeText}
            registration={register(`legal_refs.${index}.free_text`)}
            error={errorFor(`legal_refs.${index}.free_text`)}
          />
        </div>
      ) : (
        ref.links.map((link, linkIndex) => (
          <div key={linkIndex} className="space-y-3">
            {linkIndex > 0 && (
              <>
                <p className="text-sm font-medium text-slate-700">
                  {CONNECTOR_LABEL[link.connector]}
                </p>
                <SelectField
                  label={`Bentuk peraturan ${linkIndex + 1}`}
                  value={link.form}
                  options={LINK_FORM_OPTIONS}
                  onChange={(form) => {
                    if (!isLinkForm(form)) return;
                    onUpdate({
                      ...ref,
                      links: ref.links.map((item, position) =>
                        position === linkIndex ? changeLinkForm(item, form) : item,
                      ),
                    });
                  }}
                />
              </>
            )}
            <LegalRefLinkFields
              refIndex={index}
              linkIndex={linkIndex}
              form={link.form}
              register={register}
              control={control}
              errorFor={errorFor}
              regulationTypes={regulationTypes}
            />
          </div>
        ))
      )}
    </RowGroup>
  );
}
