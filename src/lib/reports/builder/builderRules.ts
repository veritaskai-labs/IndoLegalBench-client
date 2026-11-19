import { stripBlank } from "@/lib/text";
import type { Role } from "@/types";
import type { ProductLabelMode, ScoreScope } from "./builderTypes";

/**
 * Jenis nilai yang boleh dipilih tiap peran (PBI-15 AC7, AC14), sama dengan creation_policy
 * di server #148. Test selalu pertama, jadi menjadi pilihan bawaan. Ditulis sebagai tabel
 * supaya peran atau jenis nilai baru cukup satu baris, bukan cabang `if` baru.
 */
const SCORE_SCOPES_BY_ROLE: Readonly<Record<Role, readonly ScoreScope[]>> = {
  admin: ["test", "dev", "dev_test"],
  developer_ai: ["test", "dev", "dev_test"],
  viewer: ["test"],
  contributor: ["test"],
};

/** Hanya Admin yang memutuskan nama asli atau kode produk (PBI-15 AC9). */
const LABEL_CHOOSERS: readonly Role[] = ["admin"];

/**
 * Jenis nilai yang ditawarkan di form. Ini hanya tampilan: server tetap menolak pilihan di
 * luar hak peran dengan 403. role null berarti sesi belum diketahui, jadi tidak ada pilihan.
 */
export function allowedScoreScopes(role: Role | null): readonly ScoreScope[] {
  return role === null ? [] : SCORE_SCOPES_BY_ROLE[role];
}

/** Pilihan label produk hanya tampil untuk Admin; peran lain selalu memakai nama asli. */
export function canChooseProductLabel(role: Role | null): boolean {
  return role !== null && LABEL_CHOOSERS.includes(role);
}

/** Batas judul di server (ReportCreate `max_length`), dihitung dalam karakter. */
export const REPORT_TITLE_MAX = 200;

export type TitleProblem = "TITLE_REQUIRED" | "TITLE_TOO_LONG";

/**
 * Masalah judul laporan, atau null bila judul sah. Sama dengan server: karakter kosong di tepi
 * dibuang dulu (stripBlank), lalu panjangnya dihitung per karakter (code point), bukan per unit
 * UTF-16 seperti `.length`, supaya emoji dihitung satu seperti di Python.
 */
export function titleProblem(title: string): TitleProblem | null {
  const stripped = stripBlank(title);
  if (stripped === "") return "TITLE_REQUIRED";
  return Array.from(stripped).length > REPORT_TITLE_MAX ? "TITLE_TOO_LONG" : null;
}

export interface BuilderChoices {
  scoreScope: ScoreScope;
  productLabelMode: ProductLabelMode;
}

export function normalizeChoices(role: Role | null, choices: BuilderChoices): BuilderChoices {
  void role;
  return choices;
}
