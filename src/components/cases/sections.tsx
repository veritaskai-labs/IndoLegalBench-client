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
import { CASE_HELP, CASE_PLACEHOLDER } from "@/lib/cases/caseHelpText";
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

/** Pesan error untuk satu path form, atau undefined bila tidak ada. */
export type ErrorLookup = (path: CaseFieldPath) => string | undefined;

type SectionProps = {
  register: UseFormRegister<CaseFormValues>;
  errorFor: ErrorLookup;
};
type ArrayProps = SectionProps & {
  control: Control<CaseFormValues>;
  /** True bila ada error di dalam satu baris, misalnya `legal_refs.0`. */
  rowHasError: (row: `legal_refs.${number}` | `traps.${number}`) => boolean;
};

export function IdentitySection({ register, errorFor }: SectionProps) {
  return (
    <FormSection title="Identitas" help={CASE_HELP.identity}>
      <TextField
        label="ID kasus"
        hint={CASE_HELP.caseCode}
        placeholder={CASE_PLACEHOLDER.caseCode}
        registration={register("case_code")}
        error={errorFor("case_code")}
      />
      <TextField
        label="Judul"
        hint={CASE_HELP.title}
        placeholder={CASE_PLACEHOLDER.title}
        registration={register("identity.title")}
        error={errorFor("identity.title")}
      />
      <TextField
        label="Kategori"
        hint={CASE_HELP.category}
        placeholder={CASE_PLACEHOLDER.category}
        registration={register("identity.category")}
        error={errorFor("identity.category")}
      />
      <TextAreaField
        label="Pertanyaan"
        hint={CASE_HELP.question}
        placeholder={CASE_PLACEHOLDER.question}
        rows={4}
        registration={register("identity.question")}
        error={errorFor("identity.question")}
      />
    </FormSection>
  );
}

const LEGAL_REF_FIELDS = [
  { key: "regulation_type", label: "Jenis peraturan", type: "text", name: "regulationType" },
  { key: "regulation_number", label: "Nomor", type: "text", name: "regulationNumber" },
  { key: "year", label: "Tahun", type: "number", name: "year" },
  { key: "pasal", label: "Pasal", type: "text", name: "pasal" },
  { key: "ayat", label: "Ayat (opsional)", type: "text", name: "ayat" },
  { key: "huruf", label: "Huruf (opsional)", type: "text", name: "huruf" },
] as const;

export function LegalRefsSection({ register, control, errorFor, rowHasError }: ArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "legal_refs" });
  return (
    <FormSection title="Rujukan hukum" help={CASE_HELP.legalRefs} error={errorFor("legal_refs")}>
      {fields.map((field, index) => (
        <RowGroup
          key={field.id}
          title={`Rujukan ${index + 1}`}
          removeLabel={`Hapus rujukan ${index + 1}`}
          onRemove={() => remove(index)}
          invalid={rowHasError(`legal_refs.${index}`)}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {LEGAL_REF_FIELDS.map(({ key, label, type, name }) => (
              <TextField
                key={key}
                label={label}
                hint={CASE_HELP[name]}
                placeholder={CASE_PLACEHOLDER[name]}
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
    <FormSection title="Kriteria jawaban" help={CASE_HELP.answerCriteria}>
      <TextAreaField
        label="Wajib ada"
        hint={CASE_HELP.mustContain}
        placeholder={CASE_PLACEHOLDER.mustContain}
        registration={register("answer_criteria.must_contain")}
        error={errorFor("answer_criteria.must_contain")}
      />
      <TextAreaField
        label="Tidak boleh ada"
        hint={CASE_HELP.mustNotContain}
        placeholder={CASE_PLACEHOLDER.mustNotContain}
        registration={register("answer_criteria.must_not_contain")}
        error={errorFor("answer_criteria.must_not_contain")}
      />
      <TextAreaField
        label="Kesimpulan yang diharapkan"
        hint={CASE_HELP.expectedConclusion}
        placeholder={CASE_PLACEHOLDER.expectedConclusion}
        registration={register("answer_criteria.expected_conclusion")}
        error={errorFor("answer_criteria.expected_conclusion")}
      />
    </FormSection>
  );
}

export function TrapsSection({ register, control, errorFor, rowHasError }: ArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "traps" });
  return (
    <FormSection title="Jebakan" help={CASE_HELP.traps} error={errorFor("traps")}>
      {fields.map((field, index) => (
        <RowGroup
          key={field.id}
          title={`Jebakan ${index + 1}`}
          removeLabel={`Hapus jebakan ${index + 1}`}
          onRemove={() => remove(index)}
          invalid={rowHasError(`traps.${index}`)}
        >
          <TextAreaField
            label="Deskripsi"
            hint={CASE_HELP.trapDescription}
            placeholder={CASE_PLACEHOLDER.trapDescription}
            registration={register(`traps.${index}.description`)}
            error={errorFor(`traps.${index}.description`)}
          />
          <TextAreaField
            label="Perilaku model yang diharapkan"
            hint={CASE_HELP.trapBehavior}
            placeholder={CASE_PLACEHOLDER.trapBehavior}
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
    hint: "Data pengembangan: boleh dipakai saat menyusun dan menyetel produk.",
  },
  {
    value: "test",
    hint: "Data pengujian akhir: disimpan terpisah, hanya dipakai untuk mengukur hasil.",
  },
] as const;

export function SplitTagSection({ register, errorFor }: SectionProps) {
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const error = errorFor("split_tag");
  return (
    <FormSection title="Tag dev/test" help={CASE_HELP.splitTag}>
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
