import type { FieldErrors, Resolver } from "react-hook-form";
import type { z } from "zod";
import { CaseWriteSchema } from "@/lib/generated/caseSchema";
import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import { toCaseWritePayload, type CaseFormValues } from "./caseFormMapping";
import type { CaseFieldPath } from "./saveError";

/**
 * Validasi form kasus di browser (SCRUM-109). Aturannya diturunkan dari
 * contract lewat `npm run gen:zod`, jadi yang ditolak di sini adalah hal
 * yang pasti ditolak server juga. Kriteria jawaban tidak wajib
 * untuk menyimpan draf (AC2); kekurangannya ditampilkan indikator
 * kelengkapan, bukan sebagai error.
 */

export type FieldIssue = { path: CaseFieldPath; message: string };

const FIELD_LABELS = messages({
  id: {
    case_code: "ID kasus",
    "identity.title": "Judul",
    "identity.question": "Pertanyaan",
    "identity.category": "Kategori",
    kind: "Bentuk rujukan",
    form: "Bentuk peraturan",
    connector: "Penghubung",
    regulation_type: "Jenis peraturan",
    number: "Nomor peraturan",
    year: "Tahun",
    about: "Tentang",
    pasal: "Pasal",
    angka: "Angka",
    ayat: "Ayat",
    huruf: "Huruf",
    free_text: "Teks bebas",
    "answer_criteria.expected_conclusion": "Kesimpulan yang diharapkan",
    fallback: "Isian ini",
  },
  en: {
    case_code: "Case ID",
    "identity.title": "Title",
    "identity.question": "Question",
    "identity.category": "Category",
    kind: "Reference form",
    form: "Regulation form",
    connector: "Connector",
    regulation_type: "Regulation type",
    number: "Regulation number",
    year: "Year",
    about: "About",
    pasal: "Pasal",
    angka: "Angka",
    ayat: "Ayat",
    huruf: "Huruf",
    free_text: "Free text",
    "answer_criteria.expected_conclusion": "Expected conclusion",
    fallback: "This field",
  },
});

/** Indonesian field labels. Callers that already import a label record keep this. */
export const CASE_FIELD_LABEL: Record<string, string> = FIELD_LABELS.id;

const VALIDATION_COPY = messages({
  id: {
    minOneRef: "Butuh minimal satu rujukan hukum.",
    minValue: "{label} minimal {minimum}.",
    required: "{label} wajib diisi.",
    minChars: "{label} minimal {minimum} karakter.",
    integer: "{label} harus bilangan bulat.",
    maxChars: "{label} maksimal {maximum} karakter.",
    maxValue: "{label} maksimal {maximum}.",
    caseCodeFormat:
      "ID kasus diawali huruf atau angka, lalu huruf, angka, titik, garis bawah, atau tanda hubung.",
    badFormat: "Format {label} tidak valid.",
    chooseTag: "Pilih tag dev atau test.",
    invalid: "{label} tidak valid.",
  },
  en: {
    minOneRef: "At least one legal reference is required.",
    minValue: "{label} must be at least {minimum}.",
    required: "{label} is required.",
    minChars: "{label} must be at least {minimum} characters.",
    integer: "{label} must be a whole number.",
    maxChars: "{label} must be at most {maximum} characters.",
    maxValue: "{label} must be at most {maximum}.",
    caseCodeFormat:
      "A case ID starts with a letter or number, then letters, numbers, dots, underscores, or hyphens.",
    badFormat: "The {label} format is not valid.",
    chooseTag: "Choose a dev or test tag.",
    invalid: "{label} is not valid.",
  },
});

/** `legal_refs.0.pasal` -> "Pasal", `identity.title` -> "Judul". */
function labelFor(path: string, locale: Locale): string {
  const labels: Record<string, string> = text(FIELD_LABELS, locale);
  return labels[path] ?? labels[path.split(".").at(-1) ?? ""] ?? labels.fallback;
}

/** Path zod ke path form. Frasa kriteria adalah satu textarea, jadi indeks barisnya dibuang. */
function toFormPath(path: readonly PropertyKey[]): CaseFieldPath {
  const parts = path.map(String);
  if (parts[0] === "answer_criteria" && parts.length > 2) parts.length = 2;
  return parts.join(".") as CaseFieldPath;
}

/** Nilai di path zod, untuk membedakan "kosong" dari "terlalu pendek". */
function valueAt(data: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>(
    (node, key) => (node !== null && typeof node === "object" ? (node as never)[key] : undefined),
    data,
  );
}

function tooSmallMessage(
  issue: z.core.$ZodIssueTooSmall,
  path: CaseFieldPath,
  label: string,
  data: unknown,
  locale: Locale,
): string {
  const copy = text(VALIDATION_COPY, locale);
  if (path === "legal_refs") return copy.minOneRef;
  const minimum = String(issue.minimum);
  if (issue.origin !== "string") return fill(copy.minValue, { label, minimum });
  return valueAt(data, issue.path) === ""
    ? fill(copy.required, { label })
    : fill(copy.minChars, { label, minimum });
}

function invalidTypeMessage(
  issue: z.core.$ZodIssueInvalidType,
  label: string,
  data: unknown,
  locale: Locale,
): string {
  const copy = text(VALIDATION_COPY, locale);
  // Field yang tidak dikirim (mis. tahun kosong) wajib diisi, bukan salah tipe.
  if (valueAt(data, issue.path) === undefined) return fill(copy.required, { label });
  return issue.expected === "number" || issue.expected === "int"
    ? fill(copy.integer, { label })
    : fill(copy.required, { label });
}

function messageFor(
  issue: z.core.$ZodIssue,
  path: CaseFieldPath,
  data: unknown,
  locale: Locale,
): string {
  const copy = text(VALIDATION_COPY, locale);
  const label = labelFor(path, locale);
  const formatLabel = locale === "id" ? label.toLowerCase() : label;
  switch (issue.code) {
    case "too_small":
      return tooSmallMessage(issue, path, label, data, locale);
    case "too_big":
      return issue.origin === "string"
        ? fill(copy.maxChars, { label, maximum: String(issue.maximum) })
        : fill(copy.maxValue, { label, maximum: String(issue.maximum) });
    case "invalid_format":
      return path === "case_code" ? copy.caseCodeFormat : fill(copy.badFormat, { label: formatLabel });
    case "invalid_value":
      return path === "split_tag" ? copy.chooseTag : fill(copy.invalid, { label });
    case "invalid_type":
      return invalidTypeMessage(issue, label, data, locale);
    default:
      return fill(copy.invalid, { label });
  }
}

/** Server memangkas spasi sebelum memeriksa, jadi judul berisi spasi saja tetap kosong. */
function trimmed(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(trimmed);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, trimmed(inner)]));
  }
  return value;
}

/**
 * Field rujukan yang boleh kosong. Server mengubah teks kosongnya menjadi null sebelum memeriksa
 * pola, jadi di sini teks kosong tidak boleh dihitung sebagai format yang salah. Server pula yang
 * menjawab FIELD_REQUIRED bila bentuk link mewajibkannya, karena kontrak tidak bisa menyatakannya.
 */
const BLANK_TO_NULL_FIELDS: ReadonlySet<string> = new Set([
  "about",
  "pasal",
  "angka",
  "ayat",
  "huruf",
  "free_text",
]);

function blankToNull(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    return value === "" && BLANK_TO_NULL_FIELDS.has(key) ? null : value;
  }
  if (Array.isArray(value)) return value.map((item) => blankToNull(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([name, inner]) => [name, blankToNull(inner, name)]),
    );
  }
  return value;
}

/** Semua isian yang akan ditolak server, satu pesan per field, urut sesuai form. */
export function validateCaseForm(
  values: CaseFormValues,
  locale: Locale = DEFAULT_LOCALE,
): FieldIssue[] {
  const data = blankToNull(trimmed(toCaseWritePayload(values)));
  const result = CaseWriteSchema.safeParse(data);
  if (result.success) return [];

  const issues: FieldIssue[] = [];
  const seen = new Set<string>();
  for (const issue of result.error.issues) {
    const path = toFormPath(issue.path);
    if (seen.has(path)) continue;
    seen.add(path);
    issues.push({ path, message: messageFor(issue, path, data, locale) });
  }
  return issues;
}

/** Letakkan satu error di pohon error react-hook-form, termasuk indeks baris. */
function place(errors: Record<string, unknown>, path: string, message: string): void {
  const keys = path.split(".");
  let node = errors;
  keys.slice(0, -1).forEach((key, depth) => {
    if (node[key] === undefined) node[key] = /^\d+$/.test(keys[depth + 1]) ? [] : {};
    node = node[key] as Record<string, unknown>;
  });
  node[keys.at(-1) as string] = { type: "client", message };
}

export function createCaseFormResolver(locale: Locale = DEFAULT_LOCALE): Resolver<CaseFormValues> {
  return (values) => {
    const issues = validateCaseForm(values, locale);
    if (issues.length === 0) return { values, errors: {} };

    const errors: Record<string, unknown> = {};
    for (const { path, message } of issues) place(errors, path, message);
    return { values: {}, errors: errors as FieldErrors<CaseFormValues> };
  };
}

export const caseFormResolver: Resolver<CaseFormValues> = createCaseFormResolver();

/**
 * Ratakan pohon error react-hook-form menjadi daftar, untuk ringkasan di atas
 * form. Error dari server dilewati: itu cukup ditempel di field-nya dan diberi
 * fokus, tanpa banner (SCRUM-108).
 */
export function flattenErrors(errors: unknown, prefix = ""): FieldIssue[] {
  if (errors === null || typeof errors !== "object") return [];
  const node = errors as Record<string, unknown>;
  if (typeof node.message === "string" && typeof node.type === "string") {
    return node.type === "server" ? [] : [{ path: prefix as CaseFieldPath, message: node.message }];
  }
  return Object.entries(node).flatMap(([key, inner]) =>
    // `ref` menunjuk elemen DOM, bukan error.
    key === "ref" ? [] : flattenErrors(inner, prefix === "" ? key : `${prefix}.${key}`),
  );
}
