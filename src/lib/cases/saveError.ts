import type { FieldPath } from "react-hook-form";
import { ApiError } from "@/lib/apiClient";
import type { CaseFormValues, TrapFormValues } from "./caseFormMapping";
import type { LegalRefFormValues, LegalRefLinkFormValues } from "./legalRefForm";
import { VERSION_LOCKED_MESSAGE } from "./versionErrors";

export type CaseFieldPath = FieldPath<CaseFormValues>;

export type SaveError =
  | { kind: "field"; path: CaseFieldPath; message: string; detail: string | null }
  | { kind: "form"; message: string };

export type FieldSaveError = Extract<SaveError, { kind: "field" }>;

export const GENERIC_SAVE_ERROR = "Gagal menyimpan kasus. Coba lagi.";
export const SPLIT_TAG_CHANGED_MESSAGE =
  "Tag kasus ini baru saja diubah Admin. Muat ulang halaman lalu simpan lagi.";

const FIXED_PATHS = new Map<string, CaseFieldPath>([
  ["case_code", "case_code"],
  ["split_tag", "split_tag"],
  ["identity.title", "identity.title"],
  ["identity.question", "identity.question"],
  ["identity.category", "identity.category"],
  ["legal_refs", "legal_refs"],
  ["traps", "traps"],
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

const TRAP_KEYS: readonly (keyof TrapFormValues)[] = [
  "description",
  "expected_model_behavior",
];

const ROW_FIELD = /^(legal_refs|traps)\[(\d+)\]\.(\w+)$/;
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
  const [, list, index, key] = row;
  const rowIndex = Number(index);
  if (list === "legal_refs") {
    const refKey = LEGAL_REF_KEYS.find((candidate) => candidate === key);
    return refKey === undefined ? null : `legal_refs.${rowIndex}.${refKey}`;
  }
  const trapKey = TRAP_KEYS.find((candidate) => candidate === key);
  return trapKey === undefined ? null : `traps.${rowIndex}.${trapKey}`;
}

/**
 * Terjemahkan error simpan menjadi error field atau pesan di atas form.
 * Server tetap yang memutuskan valid atau tidak; fungsi ini hanya memilih tempat dan teks.
 */
export function mapSaveError(error: unknown): SaveError {
  if (!(error instanceof ApiError)) return { kind: "form", message: GENERIC_SAVE_ERROR };

  if (error.code === "CASE_CODE_TAKEN") {
    return {
      kind: "field",
      path: "case_code",
      message: error.serverMessage ?? "ID kasus sudah dipakai di suite lain.",
      detail: null,
    };
  }
  if (error.code === "CASE_CODE_LOCKED") {
    return {
      kind: "field",
      path: "case_code",
      message: error.serverMessage ?? "ID kasus tidak bisa diubah setelah kasus pernah disetujui.",
      detail: null,
    };
  }
  if (error.code === "SPLIT_TAG_LOCKED") {
    // 409 dari server #53: tag dikunci setelah disetujui dan biasanya baru saja diubah Admin
    // di tab lain. Form tetap di tempat supaya suntingan tidak hilang.
    return { kind: "form", message: SPLIT_TAG_CHANGED_MESSAGE };
  }
  if (error.code === "VERSION_LOCKED") {
    return { kind: "form", message: VERSION_LOCKED_MESSAGE };
  }
  if (error.code === "SUITE_NOT_ACTIVE") {
    return {
      kind: "form",
      message: "Suite sudah diarsipkan, jadi kasus tidak bisa disimpan.",
    };
  }
  if (error.status === 404) {
    return { kind: "form", message: "Suite atau kasus tidak ditemukan." };
  }
  if (error.status !== 422) return { kind: "form", message: GENERIC_SAVE_ERROR };
  return mapServerFieldError(error.code, error.serverMessage, error.field);
}

/**
 * Satu error field dari server, dari simpan (422) maupun pratinjau rujukan: ditempel ke field
 * form-nya, atau jadi pesan di atas form bila form tidak punya field itu.
 */
export function mapServerFieldError(
  code: string,
  message: string | null,
  field: string | null | undefined,
): SaveError {
  const path = field ? toFormPath(field) : null;
  if (path === null) {
    return { kind: "form", message: message ?? GENERIC_SAVE_ERROR };
  }
  // Pesan VALIDATION_ERROR berasal dari Pydantic (bahasa Inggris); tampilkan teks Indonesia dulu.
  if (code === "VALIDATION_ERROR") {
    return { kind: "field", path, message: "Isian tidak valid.", detail: message };
  }
  return { kind: "field", path, message: message ?? "Isian tidak valid.", detail: null };
}

/** Teks yang tampil di bawah field: pesan, lalu detail server dalam kurung bila ada. */
export function fieldErrorText({ message, detail }: FieldSaveError): string {
  return detail === null ? message : `${message} (${detail})`;
}
