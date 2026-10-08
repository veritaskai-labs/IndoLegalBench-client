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
import type { AiProduct, ProviderType } from "@/types/provider";

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
  const ids = { name: useId(), type: useId(), url: useId(), model: useId(), limit: useId(), budget: useId() };

  const [name, setName] = useState(product?.name ?? "");
  const [providerType, setProviderType] = useState<ProviderType | "">(product?.provider_type ?? "");
  const [baseUrl, setBaseUrl] = useState(product?.base_url ?? "");
  const [modelName, setModelName] = useState(product?.model_name ?? "");
  const [credential, setCredential] = useState("");
  const [rateLimit, setRateLimit] = useState(product ? String(product.rate_limit_per_minute) : "");
  const [budget, setBudget] = useState(product ? formatRupiahInput(product.monthly_budget_idr.split(".")[0]) : "");
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

  async function handleSubmit() {
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

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
          <Labeled id={ids.name} label="Nama" required error={errors.name}>
            <input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} {...invalid(ids.name, errors.name)} className={INPUT} />
          </Labeled>

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
              editing
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
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
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
