"use client";

import { useId } from "react";
import type { UseFormRegister } from "react-hook-form";
import type { CaseFormValues } from "@/lib/cases/caseFormMapping";
import { caseHelp, casePlaceholder } from "@/lib/cases/caseHelpText";
import { messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
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

const COPY = messages({
  id: {
    identity: "Identitas",
    caseCode: "ID kasus",
    category: "Kategori",
    title: "Judul",
    question: "Pertanyaan",
    criteria: "Kriteria jawaban",
    mustContain: "Wajib ada",
    mustNotContain: "Tidak boleh ada",
    conclusion: "Kesimpulan yang diharapkan",
    tagTitle: "Tag dev/test",
    devHint: "Data pengembangan: boleh dipakai saat menyusun dan menyetel produk.",
    testHint: "Data pengujian akhir: disimpan terpisah, hanya dipakai untuk mengukur hasil.",
    locked:
      "Tag dikunci setelah kasus disetujui. Hanya Admin yang bisa mengubahnya lewat tombol \"Ubah tag\".",
  },
  en: {
    identity: "Identity",
    caseCode: "Case ID",
    category: "Category",
    title: "Title",
    question: "Question",
    criteria: "Answer criteria",
    mustContain: "Must include",
    mustNotContain: "Must not include",
    conclusion: "Expected conclusion",
    tagTitle: "Dev/test tag",
    devHint: "Development data: may be used while building and tuning the product.",
    testHint: "Final test data: kept separate and used only to measure results.",
    locked: "The tag is locked after the case is approved. Only an admin can change it with the \"Change tag\" button.",
  },
});

/** Pesan error untuk satu path form, atau undefined bila tidak ada. */
export type ErrorLookup = (path: CaseFieldPath) => string | undefined;

type SectionProps = {
  register: UseFormRegister<CaseFormValues>;
  errorFor: ErrorLookup;
};

export function IdentitySection({ register, errorFor }: Readonly<SectionProps>) {
  const copy = useText(COPY);
  const help = caseHelp(useLocale());
  const placeholder = casePlaceholder(useLocale());
  return (
    <FormSection id="section-identitas" title={copy.identity} help={help.identity}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label={copy.caseCode}
          required
          hint={help.caseCode}
          placeholder={placeholder.caseCode}
          registration={register("case_code")}
          error={errorFor("case_code")}
        />
        <TextField
          label={copy.category}
          optional
          hint={help.category}
          placeholder={placeholder.category}
          registration={register("identity.category")}
          error={errorFor("identity.category")}
        />
      </div>
      <TextField
        label={copy.title}
        required
        hint={help.title}
        placeholder={placeholder.title}
        registration={register("identity.title")}
        error={errorFor("identity.title")}
      />
      <TextAreaField
        label={copy.question}
        required
        hint={help.question}
        placeholder={placeholder.question}
        rows={4}
        registration={register("identity.question")}
        error={errorFor("identity.question")}
      />
    </FormSection>
  );
}

export function AnswerCriteriaSection({ register, errorFor }: Readonly<SectionProps>) {
  const copy = useText(COPY);
  const help = caseHelp(useLocale());
  const placeholder = casePlaceholder(useLocale());
  return (
    <FormSection
      id="section-kriteria-jawaban"
      title={copy.criteria}
      help={help.answerCriteria}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextAreaField
          label={copy.mustContain}
          hint={help.mustContain}
          placeholder={placeholder.mustContain}
          registration={register("answer_criteria.must_contain")}
          error={errorFor("answer_criteria.must_contain")}
        />
        <TextAreaField
          label={copy.mustNotContain}
          hint={help.mustNotContain}
          placeholder={placeholder.mustNotContain}
          registration={register("answer_criteria.must_not_contain")}
          error={errorFor("answer_criteria.must_not_contain")}
        />
      </div>
      <TextAreaField
        label={copy.conclusion}
        hint={help.expectedConclusion}
        placeholder={placeholder.expectedConclusion}
        registration={register("answer_criteria.expected_conclusion")}
        error={errorFor("answer_criteria.expected_conclusion")}
      />
    </FormSection>
  );
}

const SPLIT_TAGS = ["dev", "test"] as const;

type SplitTagSectionProps = SectionProps & {
  /** Tag kasus yang sudah disetujui. Ditampilkan sebagai badge, tidak bisa dipilih (PBI-9 AC3). */
  lockedTag?: SplitTag | null;
};

export function SplitTagSection({
  register,
  errorFor,
  lockedTag = null,
}: Readonly<SplitTagSectionProps>) {
  const copy = useText(COPY);
  const help = caseHelp(useLocale());
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const error = errorFor("split_tag");
  const hints = { dev: copy.devHint, test: copy.testHint };
  if (lockedTag !== null) {
    // Radio sengaja tidak dirender: input yang dinonaktifkan tidak ikut dikirim react-hook-form,
    // sedangkan nilai dari defaultValues tetap terkirim dan server menolak perubahan tag di PUT.
    return (
      <FormSection id="section-tag-dev-test" title={copy.tagTitle} help={help.splitTag}>
        <div className="space-y-2">
          <SplitTagBadge tag={lockedTag} />
          <p className="text-xs text-muted">{copy.locked}</p>
        </div>
      </FormSection>
    );
  }
  return (
    <FormSection id="section-tag-dev-test" title={copy.tagTitle} help={help.splitTag}>
      {/* aria-invalid berlaku untuk grup radio, bukan tiap radio (ARIA). */}
      <div role="radiogroup" aria-label={copy.tagTitle} {...invalidProps(errorId, error)} className="space-y-4">
        {SPLIT_TAGS.map((value) => {
          const hint = hints[value];
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
                <label htmlFor={id} className="block w-full cursor-pointer">
                  <span className="block text-sm font-medium text-ink">{value}</span>
                  <span id={hintId} className="block text-xs text-muted">
                    {hint}
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {error !== undefined && <ErrorText id={errorId} message={error} />}
    </FormSection>
  );
}
