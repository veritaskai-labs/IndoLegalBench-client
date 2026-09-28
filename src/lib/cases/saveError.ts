import type { FieldPath } from "react-hook-form";
import { ApiError } from "@/lib/apiClient";
import type {
  CaseFormValues,
  LegalRefFormValues,
  TrapFormValues,
} from "./caseFormMapping";

export type CaseFieldPath = FieldPath<CaseFormValues>;

export type SaveError =
  | { kind: "field"; path: CaseFieldPath; message: string; detail: string | null }
  | { kind: "form"; message: string };

export const GENERIC_SAVE_ERROR = "Gagal menyimpan kasus. Coba lagi.";

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

const LEGAL_REF_KEYS: readonly (keyof LegalRefFormValues)[] = [
  "regulation_type",
  "regulation_number",
  "year",
  "pasal",
  "ayat",
  "huruf",
];

const TRAP_KEYS: readonly (keyof TrapFormValues)[] = [
  "description",
  "expected_model_behavior",
];

const ROW_FIELD = /^(legal_refs|traps)\[(\d+)\]\.(\w+)$/;
/** Satu frasa di server, satu textarea di form: buang indeks frasanya. */
const PHRASE_ITEM = /^(answer_criteria\.must(?:_not)?_contain)\[\d+\]$/;

/** Ubah path server `legal_refs[1].pasal` ke path form `legal_refs.1.pasal`, atau null bila form tidak punya field itu. */
function toFormPath(field: string): CaseFieldPath | null {
  const fixed = FIXED_PATHS.get(field.replace(PHRASE_ITEM, "$1"));
  if (fixed !== undefined) return fixed;

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

  const path = error.field ? toFormPath(error.field) : null;
  if (path === null) {
    return { kind: "form", message: error.serverMessage ?? GENERIC_SAVE_ERROR };
  }
  // Pesan VALIDATION_ERROR berasal dari Pydantic (bahasa Inggris); tampilkan teks Indonesia dulu.
  if (error.code === "VALIDATION_ERROR") {
    return { kind: "field", path, message: "Isian tidak valid.", detail: error.serverMessage };
  }
  return {
    kind: "field",
    path,
    message: error.serverMessage ?? "Isian tidak valid.",
    detail: null,
  };
}
