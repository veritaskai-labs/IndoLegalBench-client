"use client";

import { useId, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { JudgeProviderSelect } from "@/components/providers/JudgeProviderSelect";
import { ProductSelect } from "@/components/providers/ProductSelect";
import { useSuites } from "@/hooks/useSuites";
import { useToast } from "@/components/ui/Toast";
import { createManualSession, manualErrorMessage } from "@/lib/runs/manualRunsApi";
import type { CaseFilter, MeasurementPurpose, ManualStartRequest } from "@/types/measurement";
import {
  CASE_FILTER_LABEL,
  MEASUREMENT_PURPOSE_LABEL,
  SESSION_LABEL_MAX_LENGTH,
  MANUAL_SESSION_DEFAULT_REPETITIONS,
  MANUAL_SESSION_MIN_REPETITIONS,
  MANUAL_SESSION_MAX_REPETITIONS,
} from "@/types/measurement";

const CASE_FILTERS: readonly CaseFilter[] = ["both", "dev", "test"];
const PURPOSES: readonly MeasurementPurpose[] = ["official", "trial"];

export function CreateManualSessionForm() {
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

  // Step 4: Pengulangan & Penilai LLM
  const [judgeProviderId, setJudgeProviderId] = useState("");
  const [repeatCount, setRepeatCount] = useState<number | "">(MANUAL_SESSION_DEFAULT_REPETITIONS);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidRepeat =
    typeof repeatCount === "number" &&
    repeatCount >= MANUAL_SESSION_MIN_REPETITIONS &&
    repeatCount <= MANUAL_SESSION_MAX_REPETITIONS;
  const isFormValid =
    label.trim().length > 0 &&
    label.trim().length <= SESSION_LABEL_MAX_LENGTH &&
    purpose !== "" &&
    selectedSuiteIds.length > 0 &&
    productId !== "" &&
    judgeProviderId !== "" &&
    isValidRepeat;

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
      judge_provider_id: judgeProviderId,
    };

    try {
      const response = await createManualSession(payload);
      showToast(`Sesi pengukuran manual “${payload.label}” berhasil dibuat`);
      router.push(`/manual-runs/${encodeURIComponent(response.session_id)}`);
    } catch (err: unknown) {
      setErrorMessage(manualErrorMessage(err, "Gagal membuat sesi pengukuran manual."));
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
            1. Informasi Sesi
          </h2>
          <p className="text-xs text-slate-500">
            Nama pengenal sesi dan penanda tujuan pengukuran.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={labelId} className="block text-sm font-medium text-slate-700">
              Nama / Label Sesi <span className="text-red-500">*</span>
            </label>
            <input
              id={labelId}
              type="text"
              required
              maxLength={SESSION_LABEL_MAX_LENGTH}
              placeholder="Contoh: Pengukuran LegalHero Batch 1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1 text-xs text-slate-500">
              Maksimal {SESSION_LABEL_MAX_LENGTH} karakter.
            </p>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">
              Tujuan Sesi <span className="text-red-500">*</span>
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
                    {MEASUREMENT_PURPOSE_LABEL[p]}
                  </button>
                );
              })}
            </div>
            {!purpose && (
              <p className="mt-1.5 text-xs text-slate-500">
                Pilih tujuan sesi untuk mengaktifkan tombol buat sesi.
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
              2. Pilih Suite Kasus & Filter <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pilih satu atau beberapa suite, serta tentukan kumpulan kasus yang diikutsertakan.
            </p>
          </div>
          {activeSuites.status === "ready" && activeSuites.suites.length > 0 && (
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllSuites}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClearSuites}
                className="text-slate-600 hover:text-slate-800 font-medium"
              >
                Kosongkan
              </button>
            </div>
          )}
        </header>

        <div className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">
              Daftar Suite Aktif <span className="text-red-500">*</span>
            </span>
            {activeSuites.status === "loading" && (
              <p className="text-sm text-slate-500">Memuat suite kasus…</p>
            )}
            {activeSuites.status === "error" && (
              <p className="text-sm text-red-600">Gagal memuat daftar suite.</p>
            )}
            {activeSuites.status === "ready" && activeSuites.suites.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada suite aktif yang tersedia.</p>
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
              {selectedSuiteIds.length} suite dipilih.
            </p>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">
              Filter Kasus <span className="text-red-500">*</span>
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
                    {CASE_FILTER_LABEL[f]}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Hanya kasus yang sudah disetujui (Approved) dan memiliki tag dev/test yang akan disertakan dalam snapshot.
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 3: Produk AI Manual */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            3. Produk AI Manual <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-slate-500">
            Hanya produk dengan jenis pengukuran <strong>Manual</strong> yang dapat dipilih untuk pencatatan ini.
          </p>
        </header>
        <div className="max-w-md">
          <ProductSelect
            purpose="manual_entry"
            value={productId}
            onChange={setProductId}
            required
            label="Pilih Produk AI Manual"
          />
        </div>
      </section>

      {/* Bagian 4: Pengulangan & Penilai LLM */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            4. Pengulangan & Penilai LLM
          </h2>
          <p className="text-xs text-slate-500">
            Tentukan berapa kali pengisian jawaban manual dilakukan dan model penilai yang digunakan.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="repeat-count-input" className="block text-sm font-medium text-slate-700">
              Jumlah Pengulangan ({MANUAL_SESSION_MIN_REPETITIONS}–{MANUAL_SESSION_MAX_REPETITIONS}){" "}
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
              Standar pengukuran manual adalah{" "}
              <strong>{MANUAL_SESSION_DEFAULT_REPETITIONS} kali</strong> (rentang{" "}
              {MANUAL_SESSION_MIN_REPETITIONS} sampai {MANUAL_SESSION_MAX_REPETITIONS}).
            </p>
          </div>

          <JudgeProviderSelect
            value={judgeProviderId}
            onChange={setJudgeProviderId}
            disabled={isSubmitting}
          />
        </div>
      </section>

      {/* Tombol Aksi */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/manual-runs")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Membuat Sesi…" : "Buat Sesi Pengukuran"}
        </button>
      </div>
    </form>
  );
}
