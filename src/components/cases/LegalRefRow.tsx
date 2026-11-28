"use client";

import { useId, useState } from "react";
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import type { RegulationTypesResource } from "@/hooks/useRegulationTypes";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import { caseHelp, casePlaceholder } from "@/lib/cases/caseHelpText";
import {
  canRemoveLink,
  chainedLink,
  changeLinkForm,
  changeRefMode,
  CONNECTOR_OPTIONS,
  linkFormOptions,
  needsFreeTextConfirm,
  refMode,
  refModeOptions,
  type LegalRefFormValues,
  type RefMode,
} from "@/lib/cases/legalRefForm";
import { CHROME } from "@/lib/i18n/chrome";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { CitationPreview } from "@/lib/cases/legalRefPreview";
import { AddRowButton, RowGroup, SelectField, TextAreaField } from "./fields";
import { LegalRefLinkFields } from "./LegalRefLinkFields";
import type { ErrorLookup } from "./sections";

const COPY = messages({
  id: {
    title: "Rujukan {number}",
    removeRef: "Hapus rujukan {number}",
    form: "Bentuk rujukan",
    unstructured: "Tidak terstruktur",
    freeText: "Teks bebas",
    connector: "Penghubung peraturan {number}",
    linkForm: "Bentuk peraturan {number}",
    removeRegulation: "Hapus peraturan",
    removeRegulationLabel: "Hapus peraturan {number}",
    chain: "+ Rangkai peraturan",
    previewLabel: "Pratinjau rujukan {number}",
    preview: "Pratinjau: ",
    switchTitle: "Ganti ke Teks Bebas?",
    switchBody:
      "Rujukan ini merangkai {count} peraturan. Kalau diganti ke Teks Bebas, rangkaian itu dihapus dan isinya perlu diketik ulang sebagai teks.",
    switchConfirm: "Ganti ke Teks Bebas",
  },
  en: {
    title: "Reference {number}",
    removeRef: "Remove reference {number}",
    form: "Reference form",
    unstructured: "Unstructured",
    freeText: "Free text",
    connector: "Connector for regulation {number}",
    linkForm: "Form of regulation {number}",
    removeRegulation: "Remove regulation",
    removeRegulationLabel: "Remove regulation {number}",
    chain: "+ Chain a regulation",
    previewLabel: "Reference {number} preview",
    preview: "Preview: ",
    switchTitle: "Switch to free text?",
    switchBody:
      "This reference chains {count} regulations. Switching to free text deletes that chain, and the contents have to be typed again.",
    switchConfirm: "Switch to free text",
  },
});

type Props = {
  index: number;
  control: Control<CaseFormValues>;
  register: UseFormRegister<CaseFormValues>;
  errorFor: ErrorLookup;
  /** Baris ini berisi isian yang ditolak, supaya disorot. */
  invalid: boolean;
  /** Teks atau error dari server untuk rujukan ini (SCRUM-162), null bila belum ada. */
  preview: CitationPreview | null;
  regulationTypes: RegulationTypesResource;
  /** Ganti seluruh baris, mis. saat bentuknya berubah. Isian baris dipasang ulang. */
  onUpdate: (value: LegalRefFormValues) => void;
  onRemove: () => void;
};

/** Satu rujukan: pilihan bentuk, lalu peraturan-peraturan yang dirangkai atau teks bebas. */
export function LegalRefRow({
  index,
  control,
  register,
  errorFor,
  invalid,
  preview,
  regulationTypes,
  onUpdate,
  onRemove,
}: Readonly<Props>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const help = caseHelp(locale);
  const placeholder = casePlaceholder(locale);
  const number = index + 1;
  // Id dari useFieldArray, bukan indeks: menghapus peraturan di tengah tidak menggeser isian.
  const links = useFieldArray({ control, name: `legal_refs.${index}.links` });
  // Bentuk Teks Bebas yang menunggu konfirmasi karena akan membuang rangkaian.
  const [pendingMode, setPendingMode] = useState<RefMode | null>(null);
  // Saat baris dihapus, satu render berlalu sebelum daftar ikut menyusut.
  const ref: LegalRefFormValues | undefined = useWatch({ control, name: `legal_refs.${index}` });
  if (ref === undefined) return null;

  function chooseMode(current: LegalRefFormValues, mode: RefMode) {
    if (needsFreeTextConfirm(current, mode)) {
      setPendingMode(mode);
      return;
    }
    onUpdate(changeRefMode(current, mode));
  }

  return (
    <RowGroup
      title={fill(copy.title, { number })}
      removeLabel={fill(copy.removeRef, { number })}
      onRemove={onRemove}
      invalid={invalid}
    >
      <SelectField
        label={copy.form}
        hint={help.refForm}
        value={refMode(ref)}
        options={refModeOptions(locale)}
        // Kesalahan struktur rujukan (bentuk atau daftar link) tidak punya kolom sendiri.
        error={errorFor(`legal_refs.${index}.kind`) ?? errorFor(`legal_refs.${index}.links`)}
        onChange={(mode) => chooseMode(ref, mode)}
      />
      {pendingMode !== null && (
        <ConfirmFreeText
          linkCount={ref.links.length}
          onConfirm={() => {
            setPendingMode(null);
            onUpdate(changeRefMode(ref, pendingMode));
          }}
          onCancel={() => setPendingMode(null)}
        />
      )}
      {ref.kind === "free_text" ? (
        <div>
          <p className="mb-1">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              {copy.unstructured}
            </span>
          </p>
          <TextAreaField
            label={copy.freeText}
            hint={help.freeText}
            placeholder={placeholder.freeText}
            registration={register(`legal_refs.${index}.free_text`)}
            error={errorFor(`legal_refs.${index}.free_text`)}
          />
        </div>
      ) : (
        <>
          {links.fields.map((field, linkIndex) => {
            const link = ref.links[linkIndex];
            if (link === undefined) return null;
            const number = linkIndex + 1;
            return (
              <div key={field.id} className="space-y-3">
                {linkIndex > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      label={fill(copy.connector, { number })}
                      value={link.connector}
                      options={CONNECTOR_OPTIONS}
                      error={errorFor(`legal_refs.${index}.links.${linkIndex}.connector`)}
                      onChange={(connector) => links.update(linkIndex, { ...link, connector })}
                    />
                    <SelectField
                      label={fill(copy.linkForm, { number })}
                      value={link.form}
                      options={linkFormOptions(locale)}
                      onChange={(form) => links.update(linkIndex, changeLinkForm(link, form))}
                    />
                  </div>
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
                {canRemoveLink(linkIndex) && (
                  <button
                    type="button"
                    onClick={() => links.remove(linkIndex)}
                    aria-label={fill(copy.removeRegulationLabel, { number })}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    {copy.removeRegulation}
                  </button>
                )}
              </div>
            );
          })}
          <AddRowButton label={copy.chain} onClick={() => links.append(chainedLink())} />
        </>
      )}
      <PreviewLine index={index} preview={preview} />
    </RowGroup>
  );
}

/** Teks rujukan dari server, atau error rujukan yang tidak punya kolom sendiri. */
function PreviewLine({ index, preview }: Readonly<{ index: number; preview: CitationPreview | null }>) {
  const copy = useText(COPY);
  const error = preview?.error?.kind === "form" ? preview.error.message : null;
  return (
    // <output> ber-role status: pembaca layar mengumumkan teks baru tanpa memindahkan fokus.
    <output aria-label={fill(copy.previewLabel, { number: index + 1 })} className="block text-sm">
      {preview?.text != null && (
        <span className="text-slate-700">
          <span className="font-medium">{copy.preview}</span>
          {preview.text}
        </span>
      )}
      {error !== null && <span className="text-red-700">{error}</span>}
    </output>
  );
}

/** Konfirmasi sebelum Teks Bebas membuang rangkaian peraturan (keputusan PO no. 8). */
function ConfirmFreeText({
  linkCount,
  onConfirm,
  onCancel,
}: Readonly<{ linkCount: number; onConfirm: () => void; onCancel: () => void }>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const titleId = useId();
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm"
    >
      <p id={titleId} className="font-medium text-amber-900">
        {copy.switchTitle}
      </p>
      <p className="mt-1 text-amber-900">{fill(copy.switchBody, { count: linkCount })}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
        >
          {copy.switchConfirm}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {chrome.cancel}
        </button>
      </div>
    </div>
  );
}
