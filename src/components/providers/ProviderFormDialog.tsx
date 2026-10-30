"use client";

import { useId, useState, type ReactNode } from "react";
import { RequiredMark, SecretInput } from "@/components/ui/SecretInput";
import { ApiError } from "@/lib/apiClient";
import { createProduct, updateProduct } from "@/lib/providers/providerApi";
import {
  formatRupiahInput,
  parseRupiahInput,
  PROVIDER_TYPE_LABEL,
} from "@/lib/providers/format";
import { modelParamsError } from "@/lib/providers/modelParameters";
import type { AiProduct, ProviderType } from "@/types/provider";

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

type Field = "name" | "provider_type" | "base_url" | "model_name" | "credential" | "rate_limit" | "budget";
type Errors = Partial<Record<Field, string>>;

const MIN_CREDENTIAL = 4;
const PROVIDER_TYPES = Object.keys(PROVIDER_TYPE_LABEL) as ProviderType[];

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
  const [measurementType, setMeasurementType] = useState<MeasurementType>("automatic");
  const [vendorName, setVendorName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [accessNote, setAccessNote] = useState("");
  const [manualParams, setManualParams] = useState("");
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
  // AC2: parameter model dikumpulkan dan divalidasi di sini; pengirimannya ke
  // kolom model_params menyusul begitu kontrak memuat PBI-23-BE-1.
  const [modelParams, setModelParams] = useState<Record<string, string | boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function validate(): Errors {
    const found: Errors = {};
    if (name.trim() === "") found.name = "Nama wajib diisi.";
    if (providerType === "") found.provider_type = "Pilih jenis API.";
    if (!isHttpUrl(baseUrl.trim())) found.base_url = "Isi URL lengkap yang diawali http:// atau https://.";
    if (modelName.trim() === "") found.model_name = "Nama model wajib diisi.";
    if (!editing && credential === "") found.credential = "Kredensial wajib diisi.";
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

  /** AC3: produk baru dikonfirmasi dulu, karena jenis pengukurannya tidak bisa diubah lagi. */
  function requestSave() {
    setFormError(null);
    if (measurementType === "automatic") {
      const found = validate();
      const paramsError = modelParamsError(modelParams);
      setErrors(found);
      if (paramsError !== null) setFormError(paramsError);
      if (paramsError !== null || Object.keys(found).length > 0) return;
    }
    if (!editing) {
      setConfirming(true);
      return;
    }
    void save();
  }

  async function save() {
    setConfirming(false);
    if (measurementType === "manual") {
      setFormError("Menyimpan produk manual menunggu dukungan server (PBI-23-BE-1).");
      return;
    }

    const payload = {
      name: name.trim(),
      provider_type: providerType as ProviderType,
      base_url: baseUrl.trim(),
      model_name: modelName.trim(),
      rate_limit_per_minute: Number(rateLimit),
      monthly_budget_idr: String(parseRupiahInput(budget)),
      ...(credential !== "" && { credential }),
    };

    setSaving(true);
    try {
      const saved = editing
        ? await updateProduct(product.id, payload)
        : await createProduct({ ...payload, credential });
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.code === "AI_PRODUCT_NAME_TAKEN") {
        setErrors({ name: "Nama produk sudah dipakai. Pilih nama lain." });
      } else if (error instanceof ApiError && error.status === 422) {
        setFormError("Isian ditolak server. Periksa kembali URL, kredensial, limit, dan budget.");
      } else {
        setFormError("Gagal menyimpan produk AI. Coba lagi.");
      }
    } finally {
      setSaving(false);
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
            onChange={setMeasurementType}
            readOnly={editing}
          />

          <Labeled id={ids.name} label="Nama" required error={errors.name}>
            <input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} {...invalid(ids.name, errors.name)} className={INPUT} />
          </Labeled>

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
                required={!editing}
                value={credential}
                onChange={setCredential}
                error={errors.credential}
                hint={
                  editing && product !== undefined
                    ? `Kredensial tersimpan (…${product.credential_hint}), isi untuk mengganti. Kosongkan bila tidak diganti.`
                    : "Disimpan terenkripsi dan tidak pernah ditampilkan lagi."
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Labeled id={ids.limit} label="Limit panggilan per menit" required error={errors.rate_limit}>
                  <input id={ids.limit} type="number" min={1} step={1} inputMode="numeric" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} {...invalid(ids.limit, errors.rate_limit)} className={INPUT} />
                </Labeled>

                <Labeled id={ids.budget} label="Budget per bulan (Rp)" required error={errors.budget}>
                  <input id={ids.budget} inputMode="numeric" value={budget} onChange={(e) => setBudget(formatRupiahInput(e.target.value))} placeholder="1.500.000" {...invalid(ids.budget, errors.budget)} className={INPUT} />
                </Labeled>
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
              <Labeled id={ids.vendorName} label="Nama penyedia" required>
                <input id={ids.vendorName} value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={INPUT} />
              </Labeled>

              <Labeled id={ids.site} label="Alamat situs" required>
                <input id={ids.site} type="url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://contoh.ai" className={INPUT} />
              </Labeled>

              <Labeled id={ids.note} label="Catatan akses">
                <textarea id={ids.note} rows={3} value={accessNote} onChange={(e) => setAccessNote(e.target.value)} className={INPUT} />
                <p className="mt-1 text-xs text-slate-500">
                  Cara tim legal mengakses platform ini. Jangan isi kata sandi di sini.
                </p>
              </Labeled>

              <Labeled id={ids.params} label="Parameter">
                <textarea id={ids.params} rows={2} value={manualParams} onChange={(e) => setManualParams(e.target.value)} className={INPUT} />
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
          onConfirm={() => void save()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

const INPUT =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 aria-[invalid=true]:border-red-600";

/** Atribut aksesibilitas untuk field wajib; aria-invalid dan deskripsi error bila ada error. */
function invalid(id: string, error: string | undefined) {
  return {
    "aria-required": true,
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