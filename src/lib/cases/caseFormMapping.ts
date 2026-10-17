import type { components } from "@/lib/generated/api";
import type { CaseRead, CaseWrite, SplitTag } from "@/types/case";
import {
  emptyLegalRef,
  visibleLinkFields,
  type LegalRefFormValues,
  type LegalRefLinkFormValues,
  type LinkExtraField,
} from "./legalRefForm";

type LegalRefLinkWrite = components["schemas"]["LegalRefLinkWrite"];
type LegalRefWrite = components["schemas"]["LegalRefWrite"];
type LegalRefRead = CaseRead["legal_refs"][number];
type LegalRefLinkRead = LegalRefRead["links"][number];

export type TrapFormValues = {
  description: string;
  expected_model_behavior: string;
};

/** Nama field sama dengan path API, jadi error server `legal_refs[0].links[0].pasal` bisa langsung ditempel ke form. */
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

/** Satu link yang dikirim. Tahun boleh hilang: server yang menjawab FIELD_REQUIRED. */
export type LegalRefLinkPayload = Omit<LegalRefLinkWrite, "year"> & { year?: number };
export type LegalRefPayload = Omit<LegalRefWrite, "links"> & { links: LegalRefLinkPayload[] };

/**
 * Body POST/PUT kasus. split_tag boleh null: radio yang belum dipilih tetap
 * dikirim supaya server yang menjawab SPLIT_TAG_REQUIRED.
 */
export type CaseWritePayload = Omit<CaseWrite, "split_tag" | "legal_refs"> & {
  split_tag: SplitTag | null;
  legal_refs: LegalRefPayload[];
};

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

/** Tahun kosong dihilangkan, bukan dikirim null, supaya server menjawab FIELD_REQUIRED. */
function yearOrOmitted(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

function phraseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * Field yang tampil di bentuk link dikirim apa adanya, kosong pun: server yang
 * men-strip teks kosong jadi null dan menjawab FIELD_REQUIRED bila bentuknya
 * mewajibkan. Field yang tidak dipakai bentuknya dikirim null.
 */
function extraFieldValue(link: LegalRefLinkFormValues, field: LinkExtraField): string | null {
  return visibleLinkFields(link.form).includes(field) ? link[field] : null;
}

function toLinkPayload(link: LegalRefLinkFormValues): LegalRefLinkPayload {
  return {
    form: link.form,
    connector: link.connector,
    regulation_type: link.regulation_type,
    number: link.number,
    year: yearOrOmitted(link.year),
    about: link.about,
    pasal: extraFieldValue(link, "pasal"),
    angka: extraFieldValue(link, "angka"),
    ayat: extraFieldValue(link, "ayat"),
    huruf: extraFieldValue(link, "huruf"),
  };
}

function toLegalRefPayload(ref: LegalRefFormValues): LegalRefPayload {
  if (ref.kind === "free_text") {
    return { kind: "free_text", free_text: ref.free_text, links: [] };
  }
  return { kind: "structured", free_text: null, links: ref.links.map(toLinkPayload) };
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
    legal_refs: values.legal_refs.map(toLegalRefPayload),
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

const hasText = (value: string | null | undefined) => textOrEmpty(value).trim() !== "";

/**
 * Bentuk yang dipakai form untuk link tersimpan. Link name_only dari pemetaan Sprint 1 bisa masih
 * punya pasal, angka, ayat, atau huruf; form menyembunyikan field itu untuk name_only dan
 * mengirimnya null, jadi isinya hilang diam-diam. Pindahkan ke bentuk yang menampilkannya.
 */
function formForSavedLink(link: LegalRefLinkRead): LegalRefLinkRead["form"] {
  if (link.form !== "name_only") return link.form;
  if (hasText(link.angka)) return "pasal_angka";
  if (hasText(link.pasal) || hasText(link.ayat) || hasText(link.huruf)) return "pasal";
  return link.form;
}

function fromLinkRead(link: LegalRefLinkRead): LegalRefLinkFormValues {
  return {
    form: formForSavedLink(link),
    connector: link.connector,
    regulation_type: link.regulation_type,
    number: link.number,
    // Rujukan Sprint 1 bisa tanpa tahun (AC9): kolom dibiarkan kosong untuk diisi Author.
    year: String(link.year ?? ""),
    about: textOrEmpty(link.about),
    pasal: textOrEmpty(link.pasal),
    angka: textOrEmpty(link.angka),
    ayat: textOrEmpty(link.ayat),
    huruf: textOrEmpty(link.huruf),
  };
}

function fromLegalRefRead(ref: LegalRefRead): LegalRefFormValues {
  return {
    kind: ref.kind,
    free_text: textOrEmpty(ref.free_text),
    links: ref.links.map(fromLinkRead),
  };
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
    legal_refs: saved.legal_refs.map(fromLegalRefRead),
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
