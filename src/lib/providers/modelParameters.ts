import type { ModelParams } from "@/types/provider";

const EFFORT_VALUES = ["low", "medium", "high"] as const;
type Effort = (typeof EFFORT_VALUES)[number];

function isEffort(value: unknown): value is Effort {
  return typeof value === "string" && EFFORT_VALUES.includes(value as Effort);
}

/** "on" dan "off" dari formulir jadi boolean; kosong berarti pakai bawaan penyedia. */
function toggleValue(value: unknown): boolean | null {
  if (value === "on" || value === true) return true;
  if (value === "off") return false;
  return null;
}

/**
 * Parameter model untuk produk Otomatis (AC2).
 * Semuanya dikirim sebagai satu objek ke kolom `model_params` (JSONB) di server;
 * produk Manual selalu mengirim null karena CHECK di server melarang keduanya terisi.
 */
export type ModelParameterKind = "number" | "choice";

export type ModelParameterField = Readonly<{
  key: string;
  label: string;
  kind: ModelParameterKind;
  helper: string;
  placeholder?: string;
  choices?: ReadonlyArray<Readonly<{ value: string; label: string }>>;
}>;

export type ModelParameterValues = Readonly<
  Record<string, string | boolean | undefined>
>;

export const TEMPERATURE_ERROR = "Temperature harus angka antara 0 dan 2.";

export const MODEL_PARAMETER_FIELDS: ReadonlyArray<ModelParameterField> = [
  {
    key: "temperature",
    label: "Temperature",
    kind: "number",
    helper: "Kosongkan untuk memakai bawaan penyedia (klien menyarankan 0.3).",
    placeholder: "0.3",
  },
  {
    key: "effort",
    label: "Effort",
    kind: "choice",
    helper: "Seberapa dalam model berpikir sebelum menjawab.",
    choices: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
  {
    key: "thinking",
    label: "Thinking",
    kind: "choice",
    helper: "Model menuliskan proses berpikirnya sebelum menjawab.",
    choices: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  },
  {
    key: "web_search",
    label: "Web search",
    kind: "choice",
    helper: "Model boleh mencari di web saat menjawab.",
    choices: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  },
];

/** Hanya temperature yang bisa salah ketik; sisanya dipilih dari daftar. */
export function modelParamsError(values: ModelParameterValues): string | null {
  const raw = values.temperature;
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2) {
    return TEMPERATURE_ERROR;
  }
  return null;
}

/** Isian kosong tidak dikirim; kalau semua kosong, server menyimpan NULL. */
export function toModelParams(values: ModelParameterValues): ModelParams | null {
  const params: ModelParams = {};

  const temperature = values.temperature;
  if (typeof temperature === "string" && temperature.trim() !== "") {
    params.temperature = Number(temperature);
  }
  if (isEffort(values.effort)) params.effort = values.effort;

  const thinking = toggleValue(values.thinking);
  if (thinking !== null) params.thinking = thinking;
  const webSearch = toggleValue(values.web_search);
  if (webSearch !== null) params.web_search = webSearch;

  return Object.keys(params).length > 0 ? params : null;
}

/** Nilai tersimpan dari server jadi isian formulir, kebalikan dari toModelParams. */
export function fromModelParams(
  params: ModelParams | null | undefined,
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  if (!params) return values;

  if (typeof params.temperature === "number") {
    values.temperature = String(params.temperature);
  }
  if (isEffort(params.effort)) values.effort = params.effort;
  if (typeof params.thinking === "boolean") {
    values.thinking = params.thinking ? "on" : "off";
  }
  if (typeof params.web_search === "boolean") {
    values.web_search = params.web_search ? "on" : "off";
  }

  return values;
}