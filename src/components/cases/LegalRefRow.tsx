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
import { CASE_HELP, CASE_PLACEHOLDER } from "@/lib/cases/caseHelpText";
import {
  canRemoveLink,
  chainedLink,
  changeLinkForm,
  changeRefMode,
  CONNECTOR_OPTIONS,
  LINK_FORM_OPTIONS,
  needsFreeTextConfirm,
  REF_MODE_OPTIONS,
  refMode,
  type LegalRefFormValues,
  type RefMode,
} from "@/lib/cases/legalRefForm";
import type { CitationPreview } from "@/lib/cases/legalRefPreview";
import { AddRowButton, RowGroup, SelectField, TextAreaField } from "./fields";
import { LegalRefLinkFields } from "./LegalRefLinkFields";
import type { ErrorLookup } from "./sections";

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
                      label={`Penghubung peraturan ${number}`}
                      value={link.connector}
                      options={CONNECTOR_OPTIONS}
                      error={errorFor(`legal_refs.${index}.links.${linkIndex}.connector`)}
                      onChange={(connector) => links.update(linkIndex, { ...link, connector })}
                    />
                    <SelectField
                      label={`Bentuk peraturan ${number}`}
                      value={link.form}
                      options={LINK_FORM_OPTIONS}
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
                    aria-label={`Hapus peraturan ${number}`}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Hapus peraturan
                  </button>
                )}
              </div>
            );
          })}
          <AddRowButton label="+ Rangkai peraturan" onClick={() => links.append(chainedLink())} />
        </>
      )}
      <PreviewLine index={index} preview={preview} />
    </RowGroup>
  );
}

/** Teks rujukan dari server, atau error rujukan yang tidak punya kolom sendiri. */
function PreviewLine({ index, preview }: Readonly<{ index: number; preview: CitationPreview | null }>) {
  const error = preview?.error?.kind === "form" ? preview.error.message : null;
  return (
    // <output> ber-role status: pembaca layar mengumumkan teks baru tanpa memindahkan fokus.
    <output aria-label={`Pratinjau rujukan ${index + 1}`} className="block text-sm">
      {preview?.text != null && (
        <span className="text-slate-700">
          <span className="font-medium">Pratinjau: </span>
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
  const titleId = useId();
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm"
    >
      <p id={titleId} className="font-medium text-amber-900">
        Ganti ke Teks Bebas?
      </p>
      <p className="mt-1 text-amber-900">
        Rujukan ini merangkai {linkCount} peraturan. Kalau diganti ke Teks Bebas, rangkaian itu
        dihapus dan isinya perlu diketik ulang sebagai teks.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
        >
          Ganti ke Teks Bebas
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
