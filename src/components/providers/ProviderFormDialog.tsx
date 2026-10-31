"use client";

import { useId, useState, type ReactNode } from "react";
import { RequiredMark, SecretInput } from "@/components/ui/SecretInput";
import { ApiError } from "@/lib/apiClient";
import {
  createProduct,
  testConnection,
  updateProduct,
} from "@/lib/providers/providerApi";
import {
  formatRupiahInput,
  parseRupiahInput,
  PROVIDER_TYPE_LABEL,
} from "@/lib/providers/format";
import {
  fromModelParams,
  modelParamsError,
  toModelParams,
} from "@/lib/providers/modelParameters";
import type {
  AiProduct,
  AiProductCreate,
  AiProductUpdate,
  ProviderType,
} from "@/types/provider";

import {
  MeasurementTypeField,
  type MeasurementType,
} from "@/components/providers/MeasurementTypeField";
import { ModelParameterFields } from "@/components/providers/ModelParameterFields";
import { SaveTypeWarningDialog } from "@/components/providers/SaveTypeWarningDialog";

type Props = {
  /** Tanpa produk berarti daftar baru, dengan produk berarti ubah. */
  product?: AiProduct;
  onClose: () => void;
  onSaved: (saved: AiProduct) => void;
};

type Field =
  | "name"
  | "provider_type"
  | "base_url"
  | "model_name"
  | "credential"
  | "rate_limit"
  | "budget"
  | "vendor_name"
  | "site_url"
  | "access_note"
  | "manual_params";
type Errors = Partial<Record<Field, string>>;

const MIN_CREDENTIAL = 4;
const PROVIDER_TYPES = Object.keys(PROVIDER_TYPE_LABEL) as ProviderType[];
const URL_ERROR = "Isi URL lengkap yang diawali http:// atau https://.";
const IMMUTABLE_ERROR =
  "Jenis pengukuran tidak bisa diubah karena produk sudah punya riwayat pengukuran. Nonaktifkan produk ini lalu daftarkan produk baru dengan nama berbeda.";
const NEW_CREDENTIAL_HINT =
  "Disimpan terenkripsi dan tidak pernah ditampilkan lagi.";
const SAVE_REJECTED =
  "Isian ditolak server. Periksa kembali URL, kredensial, limit, dan budget.";
const FIELD_REJECTED = "Isian ini ditolak server.";
const RETRY_ERROR = "Gagal menyimpan produk AI. Coba lagi.";

/** Nama field dari server (openapi) ke kunci error di form. */
const FIELD_OF: Partial<Record<string, Field>> = {
  name: "name",
  provider_type: "provider_type",
  base_url: "base_url",
  model_name: "model_name",
  credential: "credential",
  rate_limit_per_minute: "rate_limit",
  monthly_budget_idr: "budget",
  vendor_name: "vendor_name",
  site_url: "site_url",
  access_note: "access_note",
  manual_params: "manual_params",
};
const MANUAL_FIELDS: readonly Field[] = [
  "vendor_name",
  "site_url",
  "access_note",
  "manual_params",
];
const AUTOMATIC_FIELDS: readonly Field[] = [
  "provider_type",
  "base_url",
  "model_name",
  "credential",
  "rate_limit",
  "budget",
];

function isHttpUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * Form daftar/ubah produk AI (SCRUM-117, AC1 dan AC2). Kredensial write-only:
 * saat ubah, field-nya kosong dan hanya dikirim bila diisi.
 */
export function ProviderFormDialog({ product, onClose, onSaved }: Props) {
  const editing = product !== undefined;
  const ids = {
    name: useId(),
    type: useId(),
    url: useId(),
    model: useId(),
    limit: useId(),
    budget: useId(),
    vendorName: useId(),
    site: useId(),
    note: useId(),
    params: useId(),
  };
  const [name, setName] = useState(product?.name ?? "");
  const [measurementType, setMeasurementType] = useState<MeasurementType>(
    product?.measurement_type ?? "automatic",
  );
  const [vendorName, setVendorName] = useState(product?.vendor_name ?? "");
  const [siteUrl, setSiteUrl] = useState(product?.site_url ?? "");
  const [accessNote, setAccessNote] = useState(product?.access_note ?? "");
  const [manualParams, setManualParams] = useState(product?.manual_params ?? "");
  const [providerType, setProviderType] = useState<ProviderType | "">(product?.provider_type ?? "");
  const [baseUrl, setBaseUrl] = useState(product?.base_url ?? "");
  const [modelName, setModelName] = useState(product?.model_name ?? "");
  const [credential, setCredential] = useState("");
  const [rateLimit, setRateLimit] = useState(
    product?.rate_limit_per_minute != null ? String(product.rate_limit_per_minute) : "",
  );
  const [budget, setBudget] = useState(
    product?.monthly_budget_idr != null
      ? formatRupiahInput(product.monthly_budget_idr.split(".")[0])
      : "",
  );
  const [modelParams, setModelParams] = useState<Record<string, string | boolean>>(
    () => fromModelParams(product?.model_params),
  );
  const [confirming, setConfirming] = useState(false);
  /** AC4: dikunci setelah server menolak perubahan jenis karena ada riwayat. */
  const [typeLocked, setTypeLocked] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "failed" | "error" | null>(null);

  const switchingType =
    editing && measurementType !== (product?.measurement_type ?? "automatic");
  /** AC4: jenis baru berarti isian baru, jadi kredensial produk otomatis wajib. */
  const credentialRequired = !editing || switchingType;
  const storedCredentialHint =
    product?.credential_hint != null
      ? `Kredensial tersimpan (…${product.credential_hint}), isi untuk mengganti. Kosongkan bila tidak diganti.`
      : "Kredensial tersimpan, isi untuk mengganti. Kosongkan bila tidak diganti.";

  function automaticErrors(): Errors {
    const found: Errors = {};
    if (providerType === "") found.provider_type = "Pilih jenis API.";
    if (!isHttpUrl(baseUrl.trim())) found.base_url = URL_ERROR;
    if (modelName.trim() === "") found.model_name = "Nama model wajib diisi.";
    if (credentialRequired && credential === "") found.credential = "Kredensial wajib diisi.";
    else if (credential !== "" && credential.length < MIN_CREDENTIAL) {
      found.credential = `Kredensial minimal ${MIN_CREDENTIAL} karakter.`;
    }
    const limit = Number(rateLimit);
    if (rateLimit.trim() === "" || !Number.isInteger(limit) || limit <= 0) {
      found.rate_limit = "Limit wajib diisi, bilangan bulat lebih dari 0.";
    }
    const amount = parseRupiahInput(budget);
    if (amount === null || amount <= 0) found.budget = "Budget wajib diisi dan lebih dari Rp 0.";
    return found;
  }

  /** AC3: produk manual wajib punya penyedia dan alamat situs yang bisa dibuka. */
  function manualErrors(): Errors {
    const found: Errors = {};
    if (vendorName.trim() === "") found.vendor_name = "Nama penyedia wajib diisi.";
    if (!isHttpUrl(siteUrl.trim())) found.site_url = URL_ERROR;
    return found;
  }

  function validate(): Errors {
    const found: Errors = name.trim() === "" ? { name: "Nama wajib diisi." } : {};
    return {
      ...found,
      ...(measurementType === "manual" ? manualErrors() : automaticErrors()),
    };
  }


  /** Isian form dari data produk tersimpan; dipakai saat kembali ke jenis asal dan saat server menolak. */
  function fillFromProduct(saved: AiProduct) {
    setVendorName(saved.vendor_name ?? "");
    setSiteUrl(saved.site_url ?? "");
    setAccessNote(saved.access_note ?? "");
    setManualParams(saved.manual_params ?? "");
    setProviderType(saved.provider_type ?? "");
    setBaseUrl(saved.base_url ?? "");
    setModelName(saved.model_name ?? "");
    setRateLimit(
      saved.rate_limit_per_minute != null ? String(saved.rate_limit_per_minute) : "",
    );
    setBudget(
      saved.monthly_budget_idr != null
        ? formatRupiahInput(saved.monthly_budget_idr.split(".")[0])
        : "",
    );
    setModelParams(fromModelParams(saved.model_params));
  }

  /** AC4: isian jenis lama dihapus, tapi jenis asal produk diisi ulang dari data tersimpan. */
  function changeMeasurementType(next: MeasurementType) {
    if (next === measurementType) return;
    setErrors({});
    setFormError(null);
    setTestResult(null);
    setCredential("");
    if (product !== undefined && next === (product.measurement_type ?? "automatic")) {
      fillFromProduct(product);
    } else if (next === "manual") {
      setProviderType("");
      setBaseUrl("");
      setModelName("");
      setRateLimit("");
      setBudget("");
      setModelParams({});
    } else {
      setVendorName("");
      setSiteUrl("");
      setAccessNote("");
      setManualParams("");
    }
    setMeasurementType(next);
  }

  /** AC4: produk baru dan pergantian jenis dikonfirmasi dulu. */
  function requestSave() {
    setFormError(null);
    const found = validate();
    setErrors(found);
    const paramsError =
      measurementType === "automatic" ? modelParamsError(modelParams) : null;
    if (paramsError !== null) setFormError(paramsError);
    if (paramsError !== null || Object.keys(found).length > 0) return;
    if (!editing || switchingType) {
      setConfirming(true);
      return;
    }
    void save();
  }


  /** AC1: isian produk manual, sama untuk daftar baru maupun ubah. */
  function manualPayload() {
    return {
      name: name.trim(),
      measurement_type: "manual" as const,
      vendor_name: vendorName.trim(),
      site_url: siteUrl.trim(),
      access_note: accessNote.trim() === "" ? null : accessNote.trim(),
      manual_params: manualParams.trim() === "" ? null : manualParams.trim(),
    };
  }

  /** AC1: isian produk otomatis tanpa kredensial, yang aturannya berbeda per aksi. */
  function automaticPayload() {
    return {
      name: name.trim(),
      measurement_type: "automatic" as const,
      provider_type: providerType as ProviderType,
      base_url: baseUrl.trim(),
      model_name: modelName.trim(),
      rate_limit_per_minute: Number(rateLimit),
      monthly_budget_idr: String(parseRupiahInput(budget)),
      model_params: toModelParams(modelParams),
    };
  }

  function createPayload(): AiProductCreate {
    if (measurementType === "manual") return manualPayload();
    return { ...automaticPayload(), credential };
  }

  /** Kredensial write-only: hanya ikut terkirim kalau diisi ulang. */
  function updatePayload(): AiProductUpdate {
    if (measurementType === "manual") return manualPayload();
    return { ...automaticPayload(), ...(credential !== "" && { credential }) };
  }
  
  /** AC4: server menolak pergantian jenis kalau produk sudah punya riwayat. */
  function lockTypeAfterRefusal(saved: AiProduct) {
    setTypeLocked(true);
    setMeasurementType(saved.measurement_type ?? "automatic");
    fillFromProduct(saved);
    setErrors({});
    setFormError(IMMUTABLE_ERROR);
  }

  /** Field server hanya dipetakan bila isiannya memang tampil untuk jenis ini. */
  function formFieldOf(serverField: string | null): Field | null {
    if (serverField === null) return null;
    const key = FIELD_OF[serverField];
    if (key === undefined) return null;
    if (key === "name") return key;
    const shown = measurementType === "manual" ? MANUAL_FIELDS : AUTOMATIC_FIELDS;
    return shown.includes(key) ? key : null;
  }

  /** Penolakan yang menyebut field ditaruh di field itu, bukan di spanduk atas. */
  function showServerRefusal(error: ApiError) {
    const key = formFieldOf(error.field);
    if (key !== null) {
      const found: Errors = {};
      found[key] = error.serverMessage ?? FIELD_REJECTED;
      setFormError(null);
      setErrors(found);
      return;
    }
    setFormError(error.status === 422 ? error.serverMessage ?? SAVE_REJECTED : RETRY_ERROR);
  }

  async function save() {
    setConfirming(false);
    setSaving(true);
    try {
      const saved = editing
        ? await updateProduct(product.id, updatePayload())
        : await createProduct(createPayload());
      onSaved(saved);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError(RETRY_ERROR);
      } else if (error.code === "MEASUREMENT_TYPE_IMMUTABLE" && product !== undefined) {
        lockTypeAfterRefusal(product);
      } else if (error.code === "AI_PRODUCT_NAME_TAKEN") {
        setErrors({ name: "Nama produk sudah dipakai. Pilih nama lain." });
      } else {
        showServerRefusal(error);
      }
    } finally {
      setSaving(false);
    }
  }

  /** AC2: uji koneksi hanya mungkin setelah produk punya id di server. */
  async function runConnectionTest() {
    if (product === undefined) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection(product.id);
      setTestResult(result.status === "ok" ? "ok" : "failed");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  }

  const title = editing ? "Ubah produk AI" : "Daftarkan produk AI";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>

        {formError && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
            {formError}
          </div>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Isian bertanda <span className="text-red-700">*</span> wajib diisi.
        </p>
        <div className="mt-4 space-y-4">
          <MeasurementTypeField
            value={measurementType}
            onChange={changeMeasurementType}
            readOnly={typeLocked}
          />

          <Labeled id={ids.name} label="Nama" required error={errors.name}>
            <input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} {...invalid(ids.name, errors.name)} className={INPUT} />
          </Labeled>

          {measurementType === "manual" && (
            <p className="-mt-2 text-xs text-slate-500">
              &quot;HO Pro&quot; dan &quot;HO Premium&quot; adalah produk
              terpisah.
            </p>
          )}

          {measurementType === "automatic" ? (
            <>
              <Labeled id={ids.type} label="Jenis API" required error={errors.provider_type}>
                <select
                  id={ids.type}
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as ProviderType | "")}
                  {...invalid(ids.type, errors.provider_type)}
                  className={INPUT}
                >
                  <option value="">Pilih jenis API</option>
                  {PROVIDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PROVIDER_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </Labeled>

              <Labeled id={ids.url} label="URL endpoint" required error={errors.base_url}>
                <input id={ids.url} type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.contoh.com/v1/chat/completions" {...invalid(ids.url, errors.base_url)} className={INPUT} />
              </Labeled>

              <Labeled id={ids.model} label="Model" required error={errors.model_name}>
                <input id={ids.model} value={modelName} onChange={(e) => setModelName(e.target.value)} {...invalid(ids.model, errors.model_name)} className={INPUT} />
              </Labeled>

              <SecretInput
                label="Kredensial"
                required={credentialRequired}
                value={credential}
                onChange={setCredential}
                error={errors.credential}
                hint={credentialRequired ? NEW_CREDENTIAL_HINT : storedCredentialHint}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Labeled id={ids.limit} label="Limit panggilan per menit" required error={errors.rate_limit}>
                  <input id={ids.limit} type="number" min={1} step={1} inputMode="numeric" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} {...invalid(ids.limit, errors.rate_limit)} className={INPUT} />
                </Labeled>

                <Labeled id={ids.budget} label="Budget per bulan (Rp)" required error={errors.budget}>
                  <input id={ids.budget} inputMode="numeric" value={budget} onChange={(e) => setBudget(formatRupiahInput(e.target.value))} placeholder="1.500.000" {...invalid(ids.budget, errors.budget)} className={INPUT} />
                </Labeled>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => void runConnectionTest()}
                  disabled={!editing || switchingType || testing}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {testing ? "Menguji…" : "Uji koneksi"}
                </button>
                {!editing && (
                  <p className="mt-1 text-xs text-slate-500">
                    Uji koneksi tersedia setelah produk tersimpan.
                  </p>
                )}
                {editing && switchingType && (
                  <p className="mt-1 text-xs text-slate-500">
                    Simpan dulu jenis barunya, lalu uji koneksi.
                  </p>
                )}
                {testResult === "ok" && (
                  <p className="mt-1 text-xs text-emerald-700">Koneksi berhasil.</p>
                )}
                {testResult === "failed" && (
                  <p className="mt-1 text-xs text-red-700">
                    Koneksi gagal. Periksa URL, model, dan kredensial.
                  </p>
                )}
                {testResult === "error" && (
                  <p className="mt-1 text-xs text-red-700">
                    Uji koneksi tidak bisa dijalankan saat ini. Coba lagi sebentar.
                  </p>
                )}
              </div>

              <ModelParameterFields
                values={modelParams}
                onChange={(key, value) =>
                  setModelParams((current) => ({ ...current, [key]: value }))
                }
              />
            </>
          ) : (
            <>
              <Labeled id={ids.vendorName} label="Nama penyedia" required error={errors.vendor_name}>
                <input id={ids.vendorName} value={vendorName} onChange={(e) => setVendorName(e.target.value)} {...invalid(ids.vendorName, errors.vendor_name)} className={INPUT} />
              </Labeled>

              <Labeled id={ids.site} label="Alamat situs" required error={errors.site_url}>
                <input id={ids.site} type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} {...invalid(ids.site, errors.site_url)} placeholder="https://contoh.ai" className={INPUT} />
              </Labeled>

              <Labeled id={ids.note} label="Catatan akses" error={errors.access_note}>
                <textarea id={ids.note} rows={3} value={accessNote} onChange={(e) => setAccessNote(e.target.value)} {...invalid(ids.note, errors.access_note, false)} className={INPUT} />
                <p className="mt-1 text-xs text-slate-500">
                  Cara tim legal mengakses platform ini. Jangan isi kata sandi di sini.
                </p>
              </Labeled>

              <Labeled id={ids.params} label="Parameter" error={errors.manual_params}>
                <textarea id={ids.params} rows={2} value={manualParams} onChange={(e) => setManualParams(e.target.value)} {...invalid(ids.params, errors.manual_params, false)} className={INPUT} />
                <p className="mt-1 text-xs text-slate-500">
                  Teks bebas. Versi atau paket berbeda didaftarkan sebagai produk terpisah, misalnya &quot;HO Pro&quot; dan &quot;HO Premium&quot;.
                </p>
              </Labeled>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Batal
          </button>
          <button type="button" onClick={requestSave} disabled={saving} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>

      {confirming && (
        <SaveTypeWarningDialog
          measurementType={measurementType}
          switching={switchingType}
          onConfirm={() => void save()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

const INPUT =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 aria-[invalid=true]:border-red-600";

/** aria-invalid dan deskripsi error; aria-required hanya untuk isian wajib. */
function invalid(id: string, error: string | undefined, required = true) {
  return {
    ...(required ? { "aria-required": true } : {}),
    ...(error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {}),
  };
}

function Labeled({
  id,
  label,
  error,
  required = false,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex gap-1 text-sm font-medium text-slate-700">
        <label htmlFor={id}>{label}</label>
        {required && <RequiredMark />}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}