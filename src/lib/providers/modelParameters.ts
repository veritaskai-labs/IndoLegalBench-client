/**
 * Parameter model untuk produk Otomatis (AC2).
 * Semuanya dikirim sebagai satu objek ke kolom `model_params` (JSONB) di server;
 * produk Manual selalu mengirim null karena CHECK di server melarang keduanya terisi.
 */
export type ModelParameterKind = "number" | "choice" | "toggle";

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

export type ModelParams = Record<string, string | number | boolean>;

export const TEMPERATURE_ERROR = "Temperature harus angka antara 0 dan 2.";

export const MODEL_PARAMETER_FIELDS: ReadonlyArray<ModelParameterField> = [
  {
    key: "temperature",
    label: "Temperature",
    kind: "number",
    helper: "Klien memakai 0.3 sebagai nilai awal.",
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
    kind: "toggle",
    helper: "Model menuliskan proses berpikirnya sebelum menjawab.",
  },
  {
    key: "web_search",
    label: "Web search",
    kind: "toggle",
    helper: "Model boleh mencari di web saat menjawab.",
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

  for (const field of MODEL_PARAMETER_FIELDS) {
    const value = values[field.key];

    if (field.kind === "toggle") {
      if (value === true) params[field.key] = true;
    } else if (typeof value === "string" && value.trim() !== "") {
      params[field.key] = field.kind === "number" ? Number(value) : value;
    }
  }

  return Object.keys(params).length > 0 ? params : null;
}