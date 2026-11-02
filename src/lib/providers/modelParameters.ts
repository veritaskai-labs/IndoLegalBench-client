import type { ModelParams } from "@/types/provider";

/**
 * Parameter model produk Otomatis sebagai teks JSON (SCRUM-248, revisi UAT klien
 * PBI-23 AC2). Server mengirimnya apa adanya ke API penyedia, jadi nama dan nilai
 * parameter mengikuti dokumentasi model masing-masing. Di sini hanya dicek bahwa
 * teksnya JSON object; aturan lain (kunci sistem, rahasia, ukuran) milik server
 * dan ditampilkan lewat field model_params pada galat 422.
 */
export const MODEL_PARAMS_EXAMPLE = '{\n  "effort": "high",\n  "thinking": true\n}';

export const MODEL_PARAMS_INVALID_JSON =
  'Parameter model harus JSON yang valid, misalnya {"effort": "high"}.';
export const MODEL_PARAMS_NOT_OBJECT =
  'Parameter model harus berupa object dengan nama parameter, misalnya {"effort": "high"}.';

export type ParsedModelParams = Readonly<{
  params: ModelParams | null;
  error: string | null;
}>;

function isObject(value: unknown): value is ModelParams {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Teks kosong dan {} berarti default penyedia, jadi dikirim sebagai null. */
export function parseModelParams(text: string): ParsedModelParams {
  if (text.trim() === "") return { params: null, error: null };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { params: null, error: MODEL_PARAMS_INVALID_JSON };
  }
  if (!isObject(value)) return { params: null, error: MODEL_PARAMS_NOT_OBJECT };
  return { params: Object.keys(value).length > 0 ? value : null, error: null };
}

/** Parameter tersimpan sebagai JSON berindentasi untuk textarea; kosong bila tidak ada. */
export function formatModelParams(params: ModelParams | null | undefined): string {
  if (!params || Object.keys(params).length === 0) return "";
  return JSON.stringify(params, null, 2);
}
