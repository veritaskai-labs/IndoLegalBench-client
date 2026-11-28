import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { ModelParams } from "@/types/provider";

/**
 * Parameter model produk Otomatis sebagai teks JSON (SCRUM-248, revisi UAT klien
 * PBI-23 AC2). Server mengirimnya apa adanya ke API penyedia, jadi nama dan nilai
 * parameter mengikuti dokumentasi model masing-masing. Di sini hanya dicek bahwa
 * teksnya JSON object; aturan lain (kunci sistem, rahasia, ukuran) milik server
 * dan ditampilkan lewat field model_params pada galat 422.
 */
export const MODEL_PARAMS_EXAMPLE = '{\n  "effort": "high",\n  "thinking": true\n}';

const MODEL_PARAMS_ERRORS = messages({
  id: {
    invalidJson: 'Parameter model harus JSON yang valid, misalnya {"effort": "high"}.',
    notObject: 'Parameter model harus berupa object dengan nama parameter, misalnya {"effort": "high"}.',
  },
  en: {
    invalidJson: 'Model parameters must be valid JSON, for example {"effort": "high"}.',
    notObject: 'Model parameters must be an object with parameter names, for example {"effort": "high"}.',
  },
});

/** Pesan Indonesia. Uji yang sudah ada membandingkan dengan konstanta ini. */
export const MODEL_PARAMS_INVALID_JSON = MODEL_PARAMS_ERRORS.id.invalidJson;
export const MODEL_PARAMS_NOT_OBJECT = MODEL_PARAMS_ERRORS.id.notObject;

export type ParsedModelParams = Readonly<{
  params: ModelParams | null;
  error: string | null;
}>;

function isObject(value: unknown): value is ModelParams {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Teks kosong dan {} berarti default penyedia, jadi dikirim sebagai null. */
export function parseModelParams(input: string, locale: Locale = DEFAULT_LOCALE): ParsedModelParams {
  if (input.trim() === "") return { params: null, error: null };

  const errors = text(MODEL_PARAMS_ERRORS, locale);
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    return { params: null, error: errors.invalidJson };
  }
  if (!isObject(value)) return { params: null, error: errors.notObject };
  return { params: Object.keys(value).length > 0 ? value : null, error: null };
}

/** Parameter tersimpan sebagai JSON berindentasi untuk textarea; kosong bila tidak ada. */
export function formatModelParams(params: ModelParams | null | undefined): string {
  if (!params || Object.keys(params).length === 0) return "";
  return JSON.stringify(params, null, 2);
}
