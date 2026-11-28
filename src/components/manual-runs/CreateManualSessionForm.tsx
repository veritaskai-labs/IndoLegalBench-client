"use client";

import { useId, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { ProductSelect } from "@/components/providers/ProductSelect";
import { useSuites } from "@/hooks/useSuites";
import { useToast } from "@/components/ui/Toast";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { createManualSession, manualErrorMessage } from "@/lib/runs/manualRunsApi";
import { caseFilterLabel, measurementPurposeLabel } from "@/lib/runs/sessionDetail";
import type { CaseFilter, MeasurementPurpose, ManualStartRequest } from "@/types/measurement";
import {
  SESSION_LABEL_MAX_LENGTH,
  MANUAL_SESSION_DEFAULT_REPETITIONS,
  MANUAL_SESSION_MIN_REPETITIONS,
  MANUAL_SESSION_MAX_REPETITIONS,
} from "@/types/measurement";

const COPY = messages({
  id: {
    created: "Sesi pengukuran manual “{label}” berhasil dibuat",
    createFailed: "Gagal membuat sesi pengukuran manual.",
    blocked: "Lengkapi dulu: {items}.",
    and: "dan",
    reqLabel: "label sesi",
    reqPurpose: "tujuan sesi",
    reqSuite: "minimal satu suite",
    reqProduct: "produk AI",
    reqRepeats: "jumlah pengulangan {min} sampai {max}",
    infoTitle: "1. Informasi Sesi",
    infoHelp: "Nama pengenal sesi dan penanda tujuan pengukuran.",
    name: "Nama / Label Sesi",
    placeholder: "Contoh: Pengukuran LegalHero Batch 1",
    max: "Maksimal {count} karakter.",
    purpose: "Tujuan Sesi",
    purposeHelp: "Pilih tujuan sesi untuk mengaktifkan tombol buat sesi.",
    suiteTitle: "2. Pilih Suite Kasus & Filter",
    suiteHelp: "Pilih satu atau beberapa suite, serta tentukan kumpulan kasus yang diikutsertakan.",
    selectAll: "Pilih Semua",
    clear: "Kosongkan",
    suiteList: "Daftar Suite Aktif",
    loadingSuites: "Memuat suite kasus…",
    suitesFailed: "Gagal memuat daftar suite.",
    noSuites: "Belum ada suite aktif yang tersedia.",
    selected: "{count} suite dipilih.",
    filter: "Filter Kasus",
    filterHelp: "Hanya kasus yang sudah disetujui (Approved) dan memiliki tag dev/test yang akan disertakan dalam snapshot.",
    productTitle: "3. Produk AI Manual",
    productHelpBefore: "Hanya produk dengan jenis pengukuran ",
    productHelpEmphasis: "Manual",
    productHelpAfter: " yang dapat dipilih untuk pencatatan ini.",
    productLabel: "Pilih Produk AI Manual",
    repeatTitle: "4. Pengulangan",
    repeatHelp: "Tentukan berapa kali pengisian jawaban manual dilakukan. LLM judge dipilih saat sesi dinilai.",
    repeatLabel: "Jumlah Pengulangan ({min}–{max})",
    repeatHint: "Standar pengukuran manual adalah {standard} kali (rentang {min} sampai {max}).",
    submitBusy: "Membuat Sesi…",
    submit: "Buat Sesi Pengukuran",
  },
  en: {
    created: "Manual measurement session “{label}” was created",
    createFailed: "Could not create the manual measurement session.",
    blocked: "Fill these in first: {items}.",
    and: "and",
    reqLabel: "a session label",
    reqPurpose: "a session purpose",
    reqSuite: "at least one suite",
    reqProduct: "an AI product",
    reqRepeats: "a repetition count from {min} to {max}",
    infoTitle: "1. Session information",
    infoHelp: "A name for the session and the purpose of the measurement.",
    name: "Session name / label",
    placeholder: "Example: LegalHero measurement, batch 1",
    max: "Maximum {count} characters.",
    purpose: "Session purpose",
    purposeHelp: "Choose a session purpose to enable the create button.",
    suiteTitle: "2. Choose case suites and a filter",
    suiteHelp: "Choose one or more suites, and which cases to include.",
    selectAll: "Select all",
    clear: "Clear",
    suiteList: "Active suites",
    loadingSuites: "Loading case suites…",
    suitesFailed: "Could not load the suite list.",
    noSuites: "No active suites are available yet.",
    selected: "{count} suites selected.",
    filter: "Case filter",
    filterHelp: "Only approved cases that have a dev/test tag are included in the snapshot.",
    productTitle: "3. Manual AI product",
    productHelpBefore: "Only products whose measurement type is ",
    productHelpEmphasis: "Manual",
    productHelpAfter: " can be chosen for this record.",
    productLabel: "Choose a manual AI product",
    repeatTitle: "4. Repetitions",
    repeatHelp: "Choose how many times the manual answer is filled in. The LLM judge is chosen when the session is graded.",
    repeatLabel: "Repetition count ({min}–{max})",
    repeatHint: "The manual measurement standard is {standard} time (range {min} to {max}).",
    submitBusy: "Creating session…",
    submit: "Create measurement session",
  },
});

type FormCopy = (typeof COPY)["id"];

function joinList(items: readonly string[], andWord: string): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${andWord} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${andWord} ${items.at(-1)}`;
}

function blockedReason(missing: readonly string[], copy: FormCopy): string | null {
  if (missing.length === 0) return null;
  return fill(copy.blocked, { items: joinList(missing, copy.and) });
}

const CASE_FILTERS: readonly CaseFilter[] = ["both", "dev", "test"];
const PURPOSES: readonly MeasurementPurpose[] = ["official", "trial"];

export function CreateManualSessionForm() {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const activeSuites = useSuites("active");

  // Step 1: Label & Tujuan Sesi
  const labelId = useId();
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState<MeasurementPurpose | "">("");

  // Step 2: Suite & Filter Kasus
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<string[]>([]);
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("both");

  // Step 3: Produk AI Manual
  const [productId, setProductId] = useState("");

  // Step 4: Pengulangan (LLM judge dipilih saat menilai, K-14)
  const [repeatCount, setRepeatCount] = useState<number | "">(MANUAL_SESSION_DEFAULT_REPETITIONS);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidRepeat =
    typeof repeatCount === "number" &&
    repeatCount >= MANUAL_SESSION_MIN_REPETITIONS &&
    repeatCount <= MANUAL_SESSION_MAX_REPETITIONS;
  const missing: string[] = [];
  if (!(label.trim().length > 0 && label.trim().length <= SESSION_LABEL_MAX_LENGTH)) missing.push(copy.reqLabel);
  if (purpose === "") missing.push(copy.reqPurpose);
  if (selectedSuiteIds.length === 0) missing.push(copy.reqSuite);
  if (productId === "") missing.push(copy.reqProduct);
  if (!isValidRepeat) {
    missing.push(fill(copy.reqRepeats, { min: MANUAL_SESSION_MIN_REPETITIONS, max: MANUAL_SESSION_MAX_REPETITIONS }));
  }
  const submitBlockedReason = blockedReason(missing, copy);
  const isFormValid = submitBlockedReason === null;
  const submitReasonId = useId();

  function handleSuiteToggle(suiteId: string) {
    setSelectedSuiteIds((prev) =>
      prev.includes(suiteId) ? prev.filter((id) => id !== suiteId) : [...prev, suiteId],
    );
  }

  function handleSelectAllSuites() {
    if (activeSuites.status !== "ready") return;
    setSelectedSuiteIds(activeSuites.suites.map((s) => s.id));
  }

  function handleClearSuites() {
    setSelectedSuiteIds([]);
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFormValid || !purpose) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: ManualStartRequest = {
      label: label.trim(),
      purpose,
      suite_ids: selectedSuiteIds,
      case_filter: caseFilter,
      product_id: productId,
      repeat_count: typeof repeatCount === "number" ? repeatCount : MANUAL_SESSION_DEFAULT_REPETITIONS,
    };

    try {
      const response = await createManualSession(payload);
      showToast(fill(copy.created, { label: payload.label }));
      router.push(`/manual-runs/${encodeURIComponent(response.session_id)}`);
    } catch (err: unknown) {
      setErrorMessage(manualErrorMessage(err, copy.createFailed, locale));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      {/* Bagian 1: Informasi Sesi */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            {copy.infoTitle}
          </h2>
          <p className="text-xs text-slate-500">{copy.infoHelp}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={labelId} className="block text-sm font-medium text-slate-700">
              {copy.name} <span className="text-red-500">*</span>
            </label>
            <input
              id={labelId}
              type="text"
              required
              maxLength={SESSION_LABEL_MAX_LENGTH}
              placeholder={copy.placeholder}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1 text-xs text-slate-500">
              {fill(copy.max, { count: SESSION_LABEL_MAX_LENGTH })}
            </p>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">
              {copy.purpose} <span className="text-red-500">*</span>
            </span>
            <div className="mt-1 flex flex-wrap gap-3">
              {PURPOSES.map((p) => {
                const isSelected = purpose === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPurpose(p)}
                    aria-pressed={isSelected}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {measurementPurposeLabel(p, locale)}
                  </button>
                );
              })}
            </div>
            {!purpose && (
              <p className="mt-1.5 text-xs text-slate-500">
                {copy.purposeHelp}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bagian 2: Suite & Filter Kasus */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {copy.suiteTitle} <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-slate-500">{copy.suiteHelp}</p>
          </div>
          {activeSuites.status === "ready" && activeSuites.suites.length > 0 && (
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllSuites}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {copy.selectAll}
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClearSuites}
                className="text-slate-600 hover:text-slate-800 font-medium"
              >
                {copy.clear}
              </button>
            </div>
          )}
        </header>

        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">
              {copy.suiteList} <span className="text-red-500">*</span>
            </span>
            {activeSuites.status === "loading" && (
              <p className="text-sm text-slate-500">{copy.loadingSuites}</p>
            )}
            {activeSuites.status === "error" && (
              <p className="text-sm text-red-600">{copy.suitesFailed}</p>
            )}
            {activeSuites.status === "ready" && activeSuites.suites.length === 0 && (
              <p className="text-sm text-slate-500">{copy.noSuites}</p>
            )}
            {activeSuites.status === "ready" && activeSuites.suites.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-md">
                {activeSuites.suites.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 p-2 rounded-md hover:bg-slate-50 text-sm cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuiteIds.includes(s.id)}
                      onChange={() => handleSuiteToggle(s.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="truncate font-medium text-slate-900">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-500">
              {fill(copy.selected, { count: selectedSuiteIds.length })}
            </p>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">
              {copy.filter} <span className="text-red-500">*</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-3">
              {CASE_FILTERS.map((f) => {
                const isSelected = caseFilter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCaseFilter(f)}
                    aria-pressed={isSelected}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {caseFilterLabel(f, locale)}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {copy.filterHelp}
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 3: Produk AI Manual */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            {copy.productTitle} <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-slate-500">
            {copy.productHelpBefore}<strong>{copy.productHelpEmphasis}</strong>{copy.productHelpAfter}
          </p>
        </header>
        <div className="max-w-md">
          <ProductSelect
            purpose="manual_entry"
            value={productId}
            onChange={setProductId}
            required
            label={copy.productLabel}
          />
        </div>
      </section>

      {/* Bagian 4: Pengulangan */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            {copy.repeatTitle}
          </h2>
          <p className="text-xs text-slate-500">{copy.repeatHelp}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="repeat-count-input" className="block text-sm font-medium text-slate-700">
              {fill(copy.repeatLabel, { min: MANUAL_SESSION_MIN_REPETITIONS, max: MANUAL_SESSION_MAX_REPETITIONS })}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="repeat-count-input"
              type="number"
              min={MANUAL_SESSION_MIN_REPETITIONS}
              max={MANUAL_SESSION_MAX_REPETITIONS}
              value={repeatCount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setRepeatCount("");
                  return;
                }
                let val = Number.parseInt(raw, 10);
                if (raw.length > 1) {
                  const lastDigit = Number.parseInt(raw.slice(-1), 10);
                  if (
                    !Number.isNaN(lastDigit) &&
                    lastDigit >= MANUAL_SESSION_MIN_REPETITIONS &&
                    lastDigit <= MANUAL_SESSION_MAX_REPETITIONS
                  ) {
                    val = lastDigit;
                  }
                }
                setRepeatCount(
                  Number.isNaN(val)
                    ? MANUAL_SESSION_DEFAULT_REPETITIONS
                    : Math.min(
                        MANUAL_SESSION_MAX_REPETITIONS,
                        Math.max(MANUAL_SESSION_MIN_REPETITIONS, val),
                      ),
                );
              }}
              onBlur={() => {
                if (
                  repeatCount === "" ||
                  typeof repeatCount !== "number" ||
                  Number.isNaN(repeatCount)
                ) {
                  setRepeatCount(MANUAL_SESSION_DEFAULT_REPETITIONS);
                }
              }}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1 text-xs text-slate-500">
              {fill(copy.repeatHint, {
                standard: MANUAL_SESSION_DEFAULT_REPETITIONS,
                min: MANUAL_SESSION_MIN_REPETITIONS,
                max: MANUAL_SESSION_MAX_REPETITIONS,
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Tombol Aksi */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/manual-runs")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {chrome.cancel}
        </button>
        {submitBlockedReason && (
          <p id={submitReasonId} className="order-first min-w-0 basis-full text-right text-xs text-ink-soft sm:order-none sm:basis-auto sm:max-w-sm">
            {submitBlockedReason}
          </p>
        )}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          aria-describedby={submitBlockedReason ? submitReasonId : undefined}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? copy.submitBusy : copy.submit}
        </button>
      </div>
    </form>
  );
}
