import { useId } from "react";
import {
  useFieldArray,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import {
  emptyLegalRef,
  emptyTrap,
  type CaseFormValues,
} from "@/lib/cases/caseFormMapping";
import type { CaseFieldPath } from "@/lib/cases/saveError";
import {
  AddRowButton,
  ErrorText,
  FormSection,
  invalidProps,
  RowGroup,
  TextAreaField,
  TextField,
} from "./fields";

/** Pesan error server untuk satu path form, atau undefined bila tidak ada. */
export type ErrorLookup = (path: CaseFieldPath) => string | undefined;

type SectionProps = {
  register: UseFormRegister<CaseFormValues>;
  errorFor: ErrorLookup;
};
type ArrayProps = SectionProps & { control: Control<CaseFormValues> };

export function IdentitySection({ register, errorFor }: SectionProps) {
  return (
    <FormSection title="Identitas">
      <TextField
        label="ID kasus"
        registration={register("case_code")}
        error={errorFor("case_code")}
      />
      <TextField
        label="Judul"
        registration={register("identity.title")}
        error={errorFor("identity.title")}
      />
      <TextField
        label="Kategori"
        registration={register("identity.category")}
        error={errorFor("identity.category")}
      />
      <TextAreaField
        label="Pertanyaan"
        rows={4}
        registration={register("identity.question")}
        error={errorFor("identity.question")}
      />
    </FormSection>
  );
}

const LEGAL_REF_FIELDS = [
  { key: "regulation_type", label: "Jenis peraturan", type: "text" },
  { key: "regulation_number", label: "Nomor", type: "text" },
  { key: "year", label: "Tahun", type: "number" },
  { key: "pasal", label: "Pasal", type: "text" },
  { key: "ayat", label: "Ayat", type: "text" },
  { key: "huruf", label: "Huruf", type: "text" },
] as const;

export function LegalRefsSection({ register, control, errorFor }: ArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "legal_refs" });
  return (
    <FormSection title="Rujukan hukum" error={errorFor("legal_refs")}>
      {fields.map((field, index) => (
        <RowGroup
          key={field.id}
          title={`Rujukan ${index + 1}`}
          removeLabel={`Hapus rujukan ${index + 1}`}
          onRemove={() => remove(index)}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {LEGAL_REF_FIELDS.map(({ key, label, type }) => (
              <TextField
                key={key}
                label={label}
                type={type}
                registration={register(`legal_refs.${index}.${key}`)}
                error={errorFor(`legal_refs.${index}.${key}`)}
              />
            ))}
          </div>
        </RowGroup>
      ))}
      <AddRowButton label="+ Tambah rujukan" onClick={() => append(emptyLegalRef())} />
    </FormSection>
  );
}

export function AnswerCriteriaSection({ register, errorFor }: SectionProps) {
  return (
    <FormSection title="Kriteria jawaban">
      <p className="text-xs text-slate-500">Satu frasa per baris.</p>
      <TextAreaField
        label="Wajib ada"
        registration={register("answer_criteria.must_contain")}
        error={errorFor("answer_criteria.must_contain")}
      />
      <TextAreaField
        label="Tidak boleh ada"
        registration={register("answer_criteria.must_not_contain")}
        error={errorFor("answer_criteria.must_not_contain")}
      />
      <TextAreaField
        label="Kesimpulan yang diharapkan"
        registration={register("answer_criteria.expected_conclusion")}
        error={errorFor("answer_criteria.expected_conclusion")}
      />
    </FormSection>
  );
}

export function TrapsSection({ register, control, errorFor }: ArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "traps" });
  return (
    <FormSection title="Jebakan" error={errorFor("traps")}>
      {fields.map((field, index) => (
        <RowGroup
          key={field.id}
          title={`Jebakan ${index + 1}`}
          removeLabel={`Hapus jebakan ${index + 1}`}
          onRemove={() => remove(index)}
        >
          <TextAreaField
            label="Deskripsi"
            registration={register(`traps.${index}.description`)}
            error={errorFor(`traps.${index}.description`)}
          />
          <TextAreaField
            label="Perilaku model yang diharapkan"
            registration={register(`traps.${index}.expected_model_behavior`)}
            error={errorFor(`traps.${index}.expected_model_behavior`)}
          />
        </RowGroup>
      ))}
      <AddRowButton label="+ Tambah jebakan" onClick={() => append(emptyTrap())} />
    </FormSection>
  );
}

const SPLIT_TAGS = [
  {
    value: "dev",
    hint: "Untuk pengembangan: boleh dipakai saat menyusun dan menyetel produk.",
  },
  {
    value: "test",
    hint: "Untuk pengujian akhir: disimpan terpisah untuk mengukur hasil.",
  },
] as const;

export function SplitTagSection({ register, errorFor }: SectionProps) {
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const error = errorFor("split_tag");
  return (
    <FormSection title="Tag dev/test">
      {/* aria-invalid berlaku untuk grup radio, bukan tiap radio (ARIA). */}
      <div role="radiogroup" aria-label="Tag dev/test" {...invalidProps(errorId, error)} className="space-y-4">
        {SPLIT_TAGS.map(({ value, hint }) => {
          const id = `${baseId}-${value}`;
          const hintId = `${id}-hint`;
          return (
            <div key={value} className="flex items-start gap-2">
              <input
                id={id}
                type="radio"
                value={value}
                {...register("split_tag")}
                aria-describedby={hintId}
                className="mt-1"
              />
              <div>
                <label htmlFor={id} className="text-sm font-medium text-slate-700">
                  {value}
                </label>
                <p id={hintId} className="text-xs text-slate-500">
                  {hint}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {error !== undefined && <ErrorText id={errorId} message={error} />}
    </FormSection>
  );
}
