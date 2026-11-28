"use client";

import { useId, useState, type ReactNode } from "react";
import { RequiredMark, SecretInput } from "@/components/ui/SecretInput";
import { ApiError } from "@/lib/apiClient";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { createProduct, testConnection, updateProduct } from "@/lib/providers/providerApi";
import { formatRupiahInput, parseRupiahInput, PROVIDER_TYPE_LABEL } from "@/lib/providers/format";
import { formatModelParams, MODEL_PARAMS_EXAMPLE, parseModelParams } from "@/lib/providers/modelParameters";
import type { AiProduct, AiProductCreate, AiProductUpdate, ProviderType } from "@/types/provider";

import { MeasurementTypeField, type MeasurementType } from "@/components/providers/MeasurementTypeField";
import { SaveTypeWarningDialog } from "@/components/providers/SaveTypeWarningDialog";

type Props = {
  /** Tanpa produk berarti daftar baru, dengan produk berarti ubah. */
  product?: AiProduct;
  /** AC4: produk sudah punya riwayat, jadi jenis terkunci sejak formulir dibuka. */
  typeLocked?: boolean;
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
  | "model_params"
  | "vendor_name"
  | "site_url"
  | "access_note"
  | "manual_params";
type Errors = Partial<Record<Field, string>>;

const MIN_CREDENTIAL = 4;
const PROVIDER_TYPES = Object.keys(PROVIDER_TYPE_LABEL) as ProviderType[];

const COPY = messages({
  id: {
    editTitle: "Ubah produk AI",
    createTitle: "Daftarkan produk AI",
    requiredBefore: "Isian bertanda ",
    requiredAfter: " wajib diisi.",
    name: "Nama",
    nameRequired: "Nama wajib diisi.",
    nameTaken: "Nama produk sudah dipakai. Pilih nama lain.",
    separateProducts: '"HO Pro" dan "HO Premium" adalah produk terpisah.',
    apiType: "Jenis API",
    apiTypeRequired: "Pilih jenis API.",
    apiTypePlaceholder: "Pilih jenis API",
    endpoint: "URL endpoint",
    urlError: "Isi URL lengkap yang diawali http:// atau https://.",
    model: "Model",
    modelRequired: "Nama model wajib diisi.",
    credential: "Kredensial",
    credentialRequired: "Kredensial wajib diisi.",
    credentialMin: "Kredensial minimal {min} karakter.",
    newCredentialHint: "Disimpan terenkripsi dan tidak pernah ditampilkan lagi.",
    storedCredentialWithHint: "Kredensial tersimpan (…{hint}), isi untuk mengganti. Kosongkan bila tidak diganti.",
    storedCredential: "Kredensial tersimpan, isi untuk mengganti. Kosongkan bila tidak diganti.",
    rateLimit: "Limit panggilan per menit",
    rateLimitRequired: "Limit wajib diisi, bilangan bulat lebih dari 0.",
    budget: "Budget per bulan (Rp)",
    budgetRequired: "Budget wajib diisi dan lebih dari Rp 0.",
    testConnection: "Uji koneksi",
    testing: "Menguji…",
    testAfterSave: "Uji koneksi tersedia setelah produk tersimpan.",
    testAfterType: "Simpan dulu jenis barunya, lalu uji koneksi.",
    testOk: "Koneksi berhasil.",
    testFailed: "Koneksi gagal. Periksa URL, model, dan kredensial.",
    testError: "Uji koneksi tidak bisa dijalankan saat ini. Coba lagi sebentar.",
    modelParams: "Parameter model",
    modelParamsHelp:
      "JSON yang dikirim apa adanya ke API model. Tulis nama parameter sesuai dokumentasi model, misalnya temperature 0.3 yang disarankan klien. Kosongkan untuk memakai bawaan penyedia. Variasi parameter didaftarkan sebagai produk terpisah, misalnya deepseek1 dan deepseek2.",
    modelParamsSecret: "Jangan isi API key, token, atau kata sandi di sini.",
    vendorName: "Nama penyedia",
    vendorRequired: "Nama penyedia wajib diisi.",
    site: "Alamat situs",
    accessNote: "Catatan akses",
    accessNoteHelp: "Cara tim legal mengakses platform ini. Jangan isi kata sandi di sini.",
    params: "Parameter",
    paramsHelp:
      'Teks bebas. Versi atau paket berbeda didaftarkan sebagai produk terpisah, misalnya "HO Pro" dan "HO Premium".',
    immutable:
      "Jenis pengukuran tidak bisa diubah karena produk sudah punya riwayat pengukuran. Nonaktifkan produk ini lalu daftarkan produk baru dengan nama berbeda.",
    fieldRejected: "Isian ini ditolak server.",
    saveRejected: "Isian ditolak server. Periksa kembali URL, kredensial, limit, dan budget.",
    retry: "Gagal menyimpan produk AI. Coba lagi.",
    saving: "Menyimpan…",
    save: "Simpan",
  },
  en: {
    editTitle: "Edit AI product",
    createTitle: "Register AI product",
    requiredBefore: "Fields marked ",
    requiredAfter: " are required.",
    name: "Name",
    nameRequired: "Name is required.",
    nameTaken: "That product name is already in use. Choose another.",
    separateProducts: '"HO Pro" and "HO Premium" are separate products.',
    apiType: "API type",
    apiTypeRequired: "Choose an API type.",
    apiTypePlaceholder: "Choose an API type",
    endpoint: "Endpoint URL",
    urlError: "Enter a full URL starting with http:// or https://.",
    model: "Model",
    modelRequired: "Model name is required.",
    credential: "Credential",
    credentialRequired: "Credential is required.",
    credentialMin: "Credential must be at least {min} characters.",
    newCredentialHint: "Stored encrypted and never shown again.",
    storedCredentialWithHint: "Stored credential (…{hint}). Type a new one to replace it. Leave it blank to keep it.",
    storedCredential: "Credential is stored. Type a new one to replace it. Leave it blank to keep it.",
    rateLimit: "Calls per minute",
    rateLimitRequired: "Limit is required and must be a whole number greater than 0.",
    budget: "Monthly budget (Rp)",
    budgetRequired: "Budget is required and must be more than Rp 0.",
    testConnection: "Test connection",
    testing: "Testing…",
    testAfterSave: "The connection test is available after the product is saved.",
    testAfterType: "Save the new type first, then test the connection.",
    testOk: "Connection succeeded.",
    testFailed: "Connection failed. Check the URL, model, and credential.",
    testError: "The connection test cannot run right now. Try again in a moment.",
    modelParams: "Model parameters",
    modelParamsHelp:
      "JSON sent to the model API as written. Use parameter names from the model documentation, for example the client-recommended temperature 0.3. Leave this empty to use the provider default. Register a parameter variation as its own product, for example deepseek1 and deepseek2.",
    modelParamsSecret: "Do not put an API key, token, or password here.",
    vendorName: "Provider name",
    vendorRequired: "Provider name is required.",
    site: "Site address",
    accessNote: "Access note",
    accessNoteHelp: "How the legal team reaches this platform. Do not put a password here.",
    params: "Parameters",
    paramsHelp: 'Free text. Register a different version or plan as its own product, for example "HO Pro" and "HO Premium".',
    immutable:
      "The measurement type cannot be changed because this product already has measurement history. Deactivate this product and register a new one under a different name.",
    fieldRejected: "The server rejected this field.",
    saveRejected: "The server rejected the form. Check the URL, credential, limit, and budget.",
    retry: "Could not save the AI product. Try again.",
    saving: "Saving…",
    save: "Save",
  },
});

/** Nama field dari server (openapi) ke kunci error di form. */
const FIELD_OF: Partial<Record<string, Field>> = {
  name: "name",
  provider_type: "provider_type",
  base_url: "base_url",
  model_name: "model_name",
  credential: "credential",
  rate_limit_per_minute: "rate_limit",
  monthly_budget_idr: "budget",
  model_params: "model_params",
  vendor_name: "vendor_name",
  site_url: "site_url",
  access_note: "access_note",
  manual_params: "manual_params",
};
const MANUAL_FIELDS: readonly Field[] = ["vendor_name", "site_url", "access_note", "manual_params"];
const AUTOMATIC_FIELDS: readonly Field[] = [
  "provider_type",
  "base_url",
  "model_name",
  "credential",
  "rate_limit",
  "budget",
  "model_params",
];

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * Form daftar/ubah produk AI (SCRUM-117, AC1 dan AC2). Kredensial write-only:
 * saat ubah, field-nya kosong dan hanya dikirim bila diisi.
 */
export function ProviderFormDialog({
  product,
  typeLocked: initialTypeLocked = false,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const editing = product !== undefined;
  const locale = useLocale();
  const copy = useText(COPY);
  const chrome = useText(CHROME);
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
    modelParams: useId(),
  };
  const [name, setName] = useState(product?.name ?? "");
  const [measurementType, setMeasurementType] = useState<MeasurementType>(product?.measurement_type ?? "automatic");
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
    product?.monthly_budget_idr != null ? formatRupiahInput(product.monthly_budget_idr.split(".")[0]) : "",
  );
  const [modelParams, setModelParams] = useState(() => formatModelParams(product?.model_params));
  const [confirming, setConfirming] = useState(false);
  /** AC4: terkunci sejak awal bila ada riwayat, atau setelah server menolak pergantian jenis. */
  const [typeLocked, setTypeLocked] = useState(initialTypeLocked);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "failed" | "error" | null>(null);

  const switchingType = editing && measurementType !== (product?.measurement_type ?? "automatic");
  /** AC4: jenis baru berarti isian baru, jadi kredensial produk otomatis wajib. */
  const credentialRequired = !editing || switchingType;
  const storedCredentialHint =
    product?.credential_hint != null
      ? fill(copy.storedCredentialWithHint, { hint: product.credential_hint })
      : copy.storedCredential;

  function automaticErrors(): Errors {
    const found: Errors = {};
    if (providerType === "") found.provider_type = copy.apiTypeRequired;
    if (!isHttpUrl(baseUrl.trim())) found.base_url = copy.urlError;
    if (modelName.trim() === "") found.model_name = copy.modelRequired;
    if (credentialRequired && credential === "") found.credential = copy.credentialRequired;
    else if (credential !== "" && credential.length < MIN_CREDENTIAL) {
      found.credential = fill(copy.credentialMin, { min: MIN_CREDENTIAL });
    }
    const limit = Number(rateLimit);
    if (rateLimit.trim() === "" || !Number.isInteger(limit) || limit <= 0) {
      found.rate_limit = copy.rateLimitRequired;
    }
    const amount = parseRupiahInput(budget);
    if (amount === null || amount <= 0) found.budget = copy.budgetRequired;
    const paramsError = parseModelParams(modelParams, locale).error;
    if (paramsError !== null) found.model_params = paramsError;
    return found;
  }

  /** AC3: produk manual wajib punya penyedia dan alamat situs yang bisa dibuka. */
  function manualErrors(): Errors {
    const found: Errors = {};
    if (vendorName.trim() === "") found.vendor_name = copy.vendorRequired;
    if (!isHttpUrl(siteUrl.trim())) found.site_url = copy.urlError;
    return found;
  }

  function validate(): Errors {
    const found: Errors = name.trim() === "" ? { name: copy.nameRequired } : {};
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
    setRateLimit(saved.rate_limit_per_minute != null ? String(saved.rate_limit_per_minute) : "");
    setBudget(saved.monthly_budget_idr != null ? formatRupiahInput(saved.monthly_budget_idr.split(".")[0]) : "");
    setModelParams(formatModelParams(saved.model_params));
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
      setModelParams("");
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
    if (Object.keys(found).length > 0) return;
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
      model_params: parseModelParams(modelParams, locale).params,
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
    setFormError(copy.immutable);
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
      found[key] = error.serverMessage ?? copy.fieldRejected;
      setFormError(null);
      setErrors(found);
      return;
    }
    setFormError(error.status === 422 ? error.serverMessage ?? copy.saveRejected : copy.retry);
  }

  async function save() {
    setConfirming(false);
    setSaving(true);
    try {
      const saved = editing ? await updateProduct(product.id, updatePayload()) : await createProduct(createPayload());
      onSaved(saved);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError(copy.retry);
      } else if (error.code === "MEASUREMENT_TYPE_IMMUTABLE" && product !== undefined) {
        lockTypeAfterRefusal(product);
      } else if (error.code === "AI_PRODUCT_NAME_TAKEN") {
        setErrors({ name: copy.nameTaken });
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

  const title = editing ? copy.editTitle : copy.createTitle;

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
          {copy.requiredBefore}
          <span className="text-red-700">*</span>
          {copy.requiredAfter}
        </p>
        <div className="mt-4 space-y-4">
          <MeasurementTypeField value={measurementType} onChange={changeMeasurementType} readOnly={typeLocked} />

          <Labeled id={ids.name} label={copy.name} required error={errors.name}>
            <input
              id={ids.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              {...invalid(ids.name, errors.name)}
              className={INPUT}
            />
          </Labeled>

          {measurementType === "manual" && <p className="-mt-2 text-xs text-slate-500">{copy.separateProducts}</p>}

          {measurementType === "automatic" ? (
            <>
              <Labeled id={ids.type} label={copy.apiType} required error={errors.provider_type}>
                <select
                  id={ids.type}
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as ProviderType | "")}
                  {...invalid(ids.type, errors.provider_type)}
                  className={INPUT}
                >
                  <option value="">{copy.apiTypePlaceholder}</option>
                  {PROVIDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PROVIDER_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </Labeled>

              <Labeled id={ids.url} label={copy.endpoint} required error={errors.base_url}>
                <input
                  id={ids.url}
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.contoh.com/v1/chat/completions"
                  {...invalid(ids.url, errors.base_url)}
                  className={INPUT}
                />
              </Labeled>

              <Labeled id={ids.model} label={copy.model} required error={errors.model_name}>
                <input
                  id={ids.model}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  {...invalid(ids.model, errors.model_name)}
                  className={INPUT}
                />
              </Labeled>

              <SecretInput
                label={copy.credential}
                required={credentialRequired}
                value={credential}
                onChange={setCredential}
                error={errors.credential}
                hint={credentialRequired ? copy.newCredentialHint : storedCredentialHint}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Labeled id={ids.limit} label={copy.rateLimit} required error={errors.rate_limit}>
                  <input
                    id={ids.limit}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(e.target.value)}
                    {...invalid(ids.limit, errors.rate_limit)}
                    className={INPUT}
                  />
                </Labeled>

                <Labeled id={ids.budget} label={copy.budget} required error={errors.budget}>
                  <input
                    id={ids.budget}
                    inputMode="numeric"
                    value={budget}
                    onChange={(e) => setBudget(formatRupiahInput(e.target.value))}
                    placeholder="1.500.000"
                    {...invalid(ids.budget, errors.budget)}
                    className={INPUT}
                  />
                </Labeled>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => void runConnectionTest()}
                  disabled={!editing || switchingType || testing}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {testing ? copy.testing : copy.testConnection}
                </button>
                {!editing && <p className="mt-1 text-xs text-slate-500">{copy.testAfterSave}</p>}
                {editing && switchingType && <p className="mt-1 text-xs text-slate-500">{copy.testAfterType}</p>}
                {testResult === "ok" && <p className="mt-1 text-xs text-emerald-700">{copy.testOk}</p>}
                {testResult === "failed" && <p className="mt-1 text-xs text-red-700">{copy.testFailed}</p>}
                {testResult === "error" && <p className="mt-1 text-xs text-red-700">{copy.testError}</p>}
              </div>

              <Labeled id={ids.modelParams} label={copy.modelParams} error={errors.model_params}>
                <textarea
                  id={ids.modelParams}
                  rows={5}
                  value={modelParams}
                  onChange={(e) => setModelParams(e.target.value)}
                  {...invalid(ids.modelParams, errors.model_params, false)}
                  placeholder={MODEL_PARAMS_EXAMPLE}
                  spellCheck={false}
                  className={`${INPUT} font-mono`}
                />
                <p className="mt-1 text-xs text-slate-500">{copy.modelParamsHelp}</p>
                <p className="mt-1 text-xs text-slate-500">{copy.modelParamsSecret}</p>
              </Labeled>
            </>
          ) : (
            <>
              <Labeled id={ids.vendorName} label={copy.vendorName} required error={errors.vendor_name}>
                <input
                  id={ids.vendorName}
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  {...invalid(ids.vendorName, errors.vendor_name)}
                  className={INPUT}
                />
              </Labeled>

              <Labeled id={ids.site} label={copy.site} required error={errors.site_url}>
                <input
                  id={ids.site}
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  {...invalid(ids.site, errors.site_url)}
                  placeholder="https://contoh.ai"
                  className={INPUT}
                />
              </Labeled>

              <Labeled id={ids.note} label={copy.accessNote} error={errors.access_note}>
                <textarea
                  id={ids.note}
                  rows={3}
                  value={accessNote}
                  onChange={(e) => setAccessNote(e.target.value)}
                  {...invalid(ids.note, errors.access_note, false)}
                  className={INPUT}
                />
                <p className="mt-1 text-xs text-slate-500">{copy.accessNoteHelp}</p>
              </Labeled>

              <Labeled id={ids.params} label={copy.params} error={errors.manual_params}>
                <textarea
                  id={ids.params}
                  rows={2}
                  value={manualParams}
                  onChange={(e) => setManualParams(e.target.value)}
                  {...invalid(ids.params, errors.manual_params, false)}
                  className={INPUT}
                />
                <p className="mt-1 text-xs text-slate-500">{copy.paramsHelp}</p>
              </Labeled>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {chrome.cancel}
          </button>
          <button
            type="button"
            onClick={requestSave}
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? copy.saving : copy.save}
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
}: Readonly<{
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}>) {
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
