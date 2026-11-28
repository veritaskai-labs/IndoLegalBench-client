import type { FieldPath } from "react-hook-form";
import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { CaseFormValues } from "./caseFormMapping";
import type { LegalRefFormValues, LegalRefLinkFormValues } from "./legalRefForm";
import { versionLockedMessage } from "./versionErrors";

export type CaseFieldPath = FieldPath<CaseFormValues>;

export type SaveError =
  | { kind: "field"; path: CaseFieldPath; message: string; detail: string | null }
  | { kind: "form"; message: string };

export type FieldSaveError = Extract<SaveError, { kind: "field" }>;

const SAVE_COPY = messages({
  id: {
    generic: "Gagal menyimpan kasus. Coba lagi.",
    splitTagChanged: "Tag kasus ini baru saja diubah Admin. Muat ulang halaman lalu simpan lagi.",
    codeTaken: "ID kasus sudah dipakai di suite lain.",
    codeLocked: "ID kasus tidak bisa diubah setelah kasus pernah disetujui.",
    suiteArchived: "Suite sudah diarsipkan, jadi kasus tidak bisa disimpan.",
    notFound: "Suite atau kasus tidak ditemukan.",
    invalid: "Isian tidak valid.",
  },
  en: {
    generic: "Could not save the case. Try again.",
    splitTagChanged: "An admin just changed this case's tag. Reload the page, then save again.",
    codeTaken: "This case ID is already used in another suite.",
    codeLocked: "The case ID cannot be changed after the case has been approved.",
    suiteArchived: "The suite is archived, so the case cannot be saved.",
    notFound: "The suite or case was not found.",
    invalid: "The value is not valid.",
  },
});

export const GENERIC_SAVE_ERROR = SAVE_COPY.id.generic;
export const SPLIT_TAG_CHANGED_MESSAGE = SAVE_COPY.id.splitTagChanged;

const FIXED_PATHS = new Map<string, CaseFieldPath>([
  ["case_code", "case_code"],
  ["split_tag", "split_tag"],
  ["identity.title", "identity.title"],
  ["identity.question", "identity.question"],
  ["identity.category", "identity.category"],
  ["legal_refs", "legal_refs"],
  ["answer_criteria.must_contain", "answer_criteria.must_contain"],
  ["answer_criteria.must_not_contain", "answer_criteria.must_not_contain"],
  ["answer_criteria.expected_conclusion", "answer_criteria.expected_conclusion"],
]);

/** Field tingkat rujukan yang bisa ditolak server: bentuk, teks bebas, dan daftar link-nya. */
const LEGAL_REF_KEYS: readonly (keyof LegalRefFormValues)[] = ["kind", "free_text", "links"];

/** Field satu link. Daftar eksplisit, bukan cast, supaya nama baru dari server tidak lolos diam-diam. */
const LEGAL_REF_LINK_KEYS: readonly (keyof LegalRefLinkFormValues)[] = [
  "form",
  "connector",
  "regulation_type",
  "number",
  "year",
  "about",
  "pasal",
  "angka",
  "ayat",
  "huruf",
];

const ROW_FIELD = /^legal_refs\[(\d+)\]\.(\w+)$/;
const LINK_FIELD = /^legal_refs\[(\d+)\]\.links\[(\d+)\]\.(\w+)$/;
/** Satu frasa di server, satu textarea di form: buang indeks frasanya. */
const PHRASE_ITEM = /^(answer_criteria\.must(?:_not)?_contain)\[\d+\]$/;

/** Ubah path server `legal_refs[1].pasal` ke path form `legal_refs.1.pasal`, atau null bila form tidak punya field itu. */
function toFormPath(field: string): CaseFieldPath | null {
  const fixed = FIXED_PATHS.get(field.replace(PHRASE_ITEM, "$1"));
  if (fixed !== undefined) return fixed;

  const link = LINK_FIELD.exec(field);
  if (link !== null) {
    const linkKey = LEGAL_REF_LINK_KEYS.find((candidate) => candidate === link[3]);
    return linkKey === undefined
      ? null
      : `legal_refs.${Number(link[1])}.links.${Number(link[2])}.${linkKey}`;
  }

  const row = ROW_FIELD.exec(field);
  if (row === null) return null;
  const [, index, key] = row;
  const refKey = LEGAL_REF_KEYS.find((candidate) => candidate === key);
  return refKey === undefined ? null : `legal_refs.${Number(index)}.${refKey}`;
}

/**
 * Terjemahkan error simpan menjadi error field atau pesan di atas form.
 * Server tetap yang memutuskan valid atau tidak; fungsi ini hanya memilih tempat dan teks.
 */
export function mapSaveError(error: unknown, locale: Locale = DEFAULT_LOCALE): SaveError {
  const copy = text(SAVE_COPY, locale);
  if (!(error instanceof ApiError)) return { kind: "form", message: copy.generic };

  if (error.code === "CASE_CODE_TAKEN") {
    return {
      kind: "field",
      path: "case_code",
      message: error.serverMessage ?? copy.codeTaken,
      detail: null,
    };
  }
  if (error.code === "CASE_CODE_LOCKED") {
    return {
      kind: "field",
      path: "case_code",
      message: error.serverMessage ?? copy.codeLocked,
      detail: null,
    };
  }
  if (error.code === "SPLIT_TAG_LOCKED") {
    // 409 dari server #53: tag dikunci setelah disetujui dan biasanya baru saja diubah Admin
    // di tab lain. Form tetap di tempat supaya suntingan tidak hilang.
    return { kind: "form", message: copy.splitTagChanged };
  }
  if (error.code === "VERSION_LOCKED") {
    return { kind: "form", message: versionLockedMessage(locale) };
  }
  if (error.code === "SUITE_NOT_ACTIVE") {
    return {
      kind: "form",
      message: copy.suiteArchived,
    };
  }
  if (error.status === 404) {
    return { kind: "form", message: copy.notFound };
  }
  if (error.status !== 422) return { kind: "form", message: copy.generic };
  return mapServerFieldError(error.code, error.serverMessage, error.field, locale);
}

/**
 * Satu error field dari server, dari simpan (422) maupun pratinjau rujukan: ditempel ke field
 * form-nya, atau jadi pesan di atas form bila form tidak punya field itu.
 */
export function mapServerFieldError(
  code: string,
  message: string | null,
  field: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): SaveError {
  const copy = text(SAVE_COPY, locale);
  const path = field ? toFormPath(field) : null;
  if (path === null) {
    return { kind: "form", message: message ?? copy.generic };
  }
  // Pesan VALIDATION_ERROR berasal dari Pydantic; kalimat klien diterjemahkan, detail server tetap.
  if (code === "VALIDATION_ERROR") {
    return { kind: "field", path, message: copy.invalid, detail: message };
  }
  return { kind: "field", path, message: message ?? copy.invalid, detail: null };
}

/** Teks yang tampil di bawah field: pesan, lalu detail server dalam kurung bila ada. */
export function fieldErrorText({ message, detail }: FieldSaveError): string {
  return detail === null ? message : `${message} (${detail})`;
}
