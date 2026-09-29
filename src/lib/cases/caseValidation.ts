import type { FieldErrors, Resolver } from "react-hook-form";
import type { z } from "zod";
import { CaseWriteSchema } from "@/lib/generated/caseSchema";
import { toCaseWritePayload, type CaseFormValues } from "./caseFormMapping";
import type { CaseFieldPath } from "./saveError";

/**
 * Validasi form kasus di browser (SCRUM-109). Aturannya diturunkan dari
 * contract lewat `npm run gen:zod`, jadi yang ditolak di sini adalah hal
 * yang pasti ditolak server juga. Jebakan dan kriteria jawaban tidak wajib
 * untuk menyimpan draf (AC2); kekurangannya ditampilkan indikator
 * kelengkapan, bukan sebagai error.
 */

export type FieldIssue = { path: CaseFieldPath; message: string };

const FIELD_LABELS: Record<string, string> = {
  case_code: "ID kasus",
  "identity.title": "Judul",
  "identity.question": "Pertanyaan",
  "identity.category": "Kategori",
  regulation_type: "Jenis peraturan",
  regulation_number: "Nomor peraturan",
  year: "Tahun",
  pasal: "Pasal",
  ayat: "Ayat",
  huruf: "Huruf",
  description: "Deskripsi jebakan",
  expected_model_behavior: "Perilaku model yang diharapkan",
  "answer_criteria.expected_conclusion": "Kesimpulan yang diharapkan",
};

const CASE_CODE_FORMAT =
  "ID kasus diawali huruf atau angka, lalu huruf, angka, titik, garis bawah, atau tanda hubung.";

/** `legal_refs.0.pasal` -> "Pasal", `identity.title` -> "Judul". */
function labelFor(path: string): string {
  return FIELD_LABELS[path] ?? FIELD_LABELS[path.split(".").at(-1) ?? ""] ?? "Isian ini";
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

function messageFor(issue: z.core.$ZodIssue, path: CaseFieldPath, data: unknown): string {
  const label = labelFor(path);
  switch (issue.code) {
    case "too_small":
      if (path === "legal_refs") return "Butuh minimal satu rujukan hukum sampai tingkat pasal.";
      if (issue.origin === "string") {
        return valueAt(data, issue.path) === ""
          ? `${label} wajib diisi.`
          : `${label} minimal ${issue.minimum} karakter.`;
      }
      return `${label} minimal ${issue.minimum}.`;
    case "too_big":
      return issue.origin === "string"
        ? `${label} maksimal ${issue.maximum} karakter.`
        : `${label} maksimal ${issue.maximum}.`;
    case "invalid_format":
      return path === "case_code" ? CASE_CODE_FORMAT : `Format ${label.toLowerCase()} tidak valid.`;
    case "invalid_value":
      return path === "split_tag" ? "Pilih tag dev atau test." : `${label} tidak valid.`;
    case "invalid_type":
      return issue.expected === "number" || issue.expected === "int"
        ? `${label} harus bilangan bulat.`
        : `${label} wajib diisi.`;
    default:
      return `${label} tidak valid.`;
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

/** Semua isian yang akan ditolak server, satu pesan per field, urut sesuai form. */
export function validateCaseForm(values: CaseFormValues): FieldIssue[] {
  const data = trimmed(toCaseWritePayload(values));
  const result = CaseWriteSchema.safeParse(data);
  if (result.success) return [];

  const issues: FieldIssue[] = [];
  const seen = new Set<string>();
  for (const issue of result.error.issues) {
    const path = toFormPath(issue.path);
    if (seen.has(path)) continue;
    seen.add(path);
    issues.push({ path, message: messageFor(issue, path, data) });
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

export const caseFormResolver: Resolver<CaseFormValues> = (values) => {
  const issues = validateCaseForm(values);
  if (issues.length === 0) return { values, errors: {} };

  const errors: Record<string, unknown> = {};
  for (const { path, message } of issues) place(errors, path, message);
  return { values: {}, errors: errors as FieldErrors<CaseFormValues> };
};

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
