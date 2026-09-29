import type { CaseRead, CaseWrite, SplitTag } from "@/types/case";

/** Satu baris rujukan hukum di form. Semua isian berupa string dari input. */
export type LegalRefFormValues = {
  regulation_type: string;
  regulation_number: string;
  year: string;
  pasal: string;
  ayat: string;
  huruf: string;
};

export type TrapFormValues = {
  description: string;
  expected_model_behavior: string;
};

/** Nama field sama dengan path API, jadi error server `legal_refs[0].pasal` bisa langsung ditempel ke form. */
export type CaseFormValues = {
  case_code: string;
  identity: { title: string; question: string; category: string };
  legal_refs: LegalRefFormValues[];
  answer_criteria: {
    /** Satu frasa per baris. */
    must_contain: string;
    must_not_contain: string;
    expected_conclusion: string;
  };
  traps: TrapFormValues[];
  split_tag: SplitTag | "";
};

/**
 * Body POST/PUT kasus. split_tag boleh null: radio yang belum dipilih tetap
 * dikirim supaya server yang menjawab SPLIT_TAG_REQUIRED.
 */
export type CaseWritePayload = Omit<CaseWrite, "split_tag"> & {
  split_tag: SplitTag | null;
};

export function emptyLegalRef(): LegalRefFormValues {
  return {
    regulation_type: "",
    regulation_number: "",
    year: "",
    pasal: "",
    ayat: "",
    huruf: "",
  };
}

export function emptyTrap(): TrapFormValues {
  return { description: "", expected_model_behavior: "" };
}

/** Nilai awal form buat kasus. Tanpa baris jebakan: baris kosong akan ditolak server. */
export function emptyCaseFormValues(): CaseFormValues {
  return {
    case_code: "",
    identity: { title: "", question: "", category: "" },
    legal_refs: [emptyLegalRef()],
    answer_criteria: {
      must_contain: "",
      must_not_contain: "",
      expected_conclusion: "",
    },
    traps: [],
    split_tag: "",
  };
}

function optionalText(value: string): string | null {
  return value.trim() === "" ? null : value;
}

function optionalYear(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function phraseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** Memetakan nilai form ke payload API. Tidak memvalidasi; server yang memutuskan. */
export function toCaseWritePayload(values: CaseFormValues): CaseWritePayload {
  return {
    case_code: values.case_code,
    identity: {
      title: values.identity.title,
      question: values.identity.question,
      category: optionalText(values.identity.category),
    },
    legal_refs: values.legal_refs.map((ref) => ({
      regulation_type: ref.regulation_type,
      regulation_number: ref.regulation_number,
      year: optionalYear(ref.year),
      pasal: ref.pasal,
      ayat: optionalText(ref.ayat),
      huruf: optionalText(ref.huruf),
    })),
    answer_criteria: {
      must_contain: phraseLines(values.answer_criteria.must_contain),
      must_not_contain: phraseLines(values.answer_criteria.must_not_contain),
      expected_conclusion: optionalText(values.answer_criteria.expected_conclusion),
    },
    traps: values.traps.map((trap) => ({
      description: trap.description,
      expected_model_behavior: optionalText(trap.expected_model_behavior),
    })),
    split_tag: values.split_tag === "" ? null : values.split_tag,
  };
}

function textOrEmpty(value: string | null | undefined): string {
  return value ?? "";
}

/** Kebalikan toCaseWritePayload: isi form edit dari kasus tersimpan. Field milik server tidak ikut. */
export function fromCaseRead(saved: CaseRead): CaseFormValues {
  const criteria = saved.answer_criteria;
  return {
    case_code: saved.case_code,
    identity: {
      title: saved.identity.title,
      question: saved.identity.question,
      category: textOrEmpty(saved.identity.category),
    },
    legal_refs: saved.legal_refs.map((ref) => ({
      regulation_type: ref.regulation_type,
      regulation_number: ref.regulation_number,
      year: String(ref.year ?? ""),
      pasal: ref.pasal,
      ayat: textOrEmpty(ref.ayat),
      huruf: textOrEmpty(ref.huruf),
    })),
    answer_criteria: {
      must_contain: (criteria.must_contain ?? []).join("\n"),
      must_not_contain: (criteria.must_not_contain ?? []).join("\n"),
      expected_conclusion: textOrEmpty(criteria.expected_conclusion),
    },
    traps: saved.traps.map((trap) => ({
      description: trap.description,
      expected_model_behavior: textOrEmpty(trap.expected_model_behavior),
    })),
    split_tag: saved.split_tag,
  };
}
