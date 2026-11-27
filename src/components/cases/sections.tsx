import { useId } from "react";
import type { UseFormRegister } from "react-hook-form";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import { CASE_HELP, CASE_PLACEHOLDER } from "@/lib/cases/caseHelpText";
import type { CaseFieldPath } from "@/lib/cases/saveError";
import type { SplitTag } from "@/types/case";
import {
  ErrorText,
  FormSection,
  invalidProps,
  TextAreaField,
  TextField,
} from "./fields";
import { SplitTagBadge } from "./SplitTagBadge";

/** Pesan error untuk satu path form, atau undefined bila tidak ada. */
export type ErrorLookup = (path: CaseFieldPath) => string | undefined;

type SectionProps = {
  register: UseFormRegister<CaseFormValues>;
  errorFor: ErrorLookup;
};

export function IdentitySection({ register, errorFor }: SectionProps) {
  return (
    <FormSection id="section-identitas" title="Identitas" help={CASE_HELP.identity}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="ID kasus"
          required
          hint={CASE_HELP.caseCode}
          placeholder={CASE_PLACEHOLDER.caseCode}
          registration={register("case_code")}
          error={errorFor("case_code")}
        />
        <TextField
          label="Kategori"
          optional
          hint={CASE_HELP.category}
          placeholder={CASE_PLACEHOLDER.category}
          registration={register("identity.category")}
          error={errorFor("identity.category")}
        />
      </div>
      <TextField
        label="Judul"
        required
        hint={CASE_HELP.title}
        placeholder={CASE_PLACEHOLDER.title}
        registration={register("identity.title")}
        error={errorFor("identity.title")}
      />
      <TextAreaField
        label="Pertanyaan"
        required
        hint={CASE_HELP.question}
        placeholder={CASE_PLACEHOLDER.question}
        rows={4}
        registration={register("identity.question")}
        error={errorFor("identity.question")}
      />
    </FormSection>
  );
}

export function AnswerCriteriaSection({ register, errorFor }: SectionProps) {
  return (
    <FormSection
      id="section-kriteria-jawaban"
      title="Kriteria jawaban"
      help={CASE_HELP.answerCriteria}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
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

type SplitTagSectionProps = SectionProps & {
  /** Tag kasus yang sudah disetujui. Ditampilkan sebagai badge, tidak bisa dipilih (PBI-9 AC3). */
  lockedTag?: SplitTag | null;
};

export function SplitTagSection({ register, errorFor, lockedTag = null }: SplitTagSectionProps) {
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const error = errorFor("split_tag");
  if (lockedTag !== null) {
    // Radio sengaja tidak dirender: input yang dinonaktifkan tidak ikut dikirim react-hook-form,
    // sedangkan nilai dari defaultValues tetap terkirim dan server menolak perubahan tag di PUT.
    return (
      <FormSection id="section-tag-dev-test" title="Tag dev/test" help={CASE_HELP.splitTag}>
        <div className="space-y-2">
          <SplitTagBadge tag={lockedTag} />
          <p className="text-xs text-muted">
            Tag dikunci setelah kasus disetujui. Hanya Admin yang bisa mengubahnya lewat tombol
            &quot;Ubah tag&quot;.
          </p>
        </div>
      </FormSection>
    );
  }
  return (
    <FormSection id="section-tag-dev-test" title="Tag dev/test" help={CASE_HELP.splitTag}>
      {/* aria-invalid berlaku untuk grup radio, bukan tiap radio (ARIA). */}
      <div role="radiogroup" aria-label="Tag dev/test" {...invalidProps(errorId, error)} className="space-y-4">
        {SPLIT_TAGS.map(({ value, hint }) => {
          const id = `${baseId}-${value}`;
          const hintId = `${id}-hint`;
          return (
            <div key={value} className="flex items-start gap-2.5">
              <input
                id={id}
                type="radio"
                value={value}
                {...register("split_tag")}
                aria-describedby={hintId}
                className="mt-1 cursor-pointer accent-accent"
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={id}
                  className="block w-full cursor-pointer text-sm font-medium text-ink"
                >
                  {value}
                </label>
                <p
                  id={hintId}
                  onClick={() => document.getElementById(id)?.click()}
                  className="cursor-pointer text-xs text-muted"
                >
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
