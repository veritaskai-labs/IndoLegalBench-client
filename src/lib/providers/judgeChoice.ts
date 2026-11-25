import type { JudgeProviderOption } from "@/types/provider";

/**
 * Pilihan penilai yang sudah tidak ada di daftar aktif (review client#92): misalnya judge hasil
 * terbaru yang dinonaktifkan setelah menilai. Kosong berarti memang belum memilih, bukan hilang.
 */
export function isUnavailableJudge(value: string, options: readonly JudgeProviderOption[]): boolean {
  return value !== "" && !options.some((option) => option.id === value);
}
