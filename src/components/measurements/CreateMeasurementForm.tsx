"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductSelect } from "@/components/providers/ProductSelect";
import { MeasurementSummaryCard } from "./MeasurementSummaryCard";
import { useSuites } from "@/hooks/useSuites";
import { useToast } from "@/components/ui/Toast";
import {
  extractBudgetExceeded,
  getMeasurementSummary,
  startMeasurement,
  type BudgetExceededInfo,
} from "@/lib/measurements/measurementApi";
import type {
  CaseFilter,
  JudgeProvider,
  MeasurementPurpose,
  StartMeasurementRequest,
  SummaryResponse,
} from "@/types/measurement";
import {
  CASE_FILTER_LABEL,
  JUDGE_PROVIDER_OPTIONS,
  MEASUREMENT_PURPOSE_LABEL,
} from "@/types/measurement";

export function CreateMeasurementForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const activeSuites = useSuites("active");

  // Step 1: Informasi Sesi
  const labelId = useId();
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState<MeasurementPurpose>("official");

  // Step 2: Suite & Filter Kasus
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<string[]>([]);
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("both");

  // Step 3: Produk AI Otomatis
  const [productId, setProductId] = useState("");

  // Step 4: Pengulangan & Penilai LLM
  const [repeatCount, setRepeatCount] = useState<number | "">(3);
  const [judgeProviderId, setJudgeProviderId] = useState<JudgeProvider>(
    JUDGE_PROVIDER_OPTIONS[0].value,
  );

  // Step 5: Summary & Error State
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [budgetExceeded, setBudgetExceeded] = useState<BudgetExceededInfo | null>(null);

  // Step 6: Confirmation Dialog & Starting
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Invalidate summary if relevant inputs change
  function invalidateSummary() {
    if (summary !== null || budgetExceeded !== null || summaryError !== null) {
      setSummary(null);
      setBudgetExceeded(null);
      setSummaryError(null);
    }
  }

  function handleSuiteToggle(suiteId: string) {
    invalidateSummary();
    setSelectedSuiteIds((prev) =>
      prev.includes(suiteId) ? prev.filter((id) => id !== suiteId) : [...prev, suiteId],
    );
  }

  function handleSelectAllSuites() {
    /* v8 ignore next */
    if (activeSuites.status !== "ready") return;
    invalidateSummary();
    setSelectedSuiteIds(activeSuites.suites.map((s) => s.id));
  }

  function handleClearSuites() {
    invalidateSummary();
    setSelectedSuiteIds([]);
  }

  async function handleFetchSummary() {
    /* v8 ignore next */
    if (selectedSuiteIds.length === 0 || !productId) return;

    setIsSummaryLoading(true);
    setSummaryError(null);
    setBudgetExceeded(null);

    try {
      const result = await getMeasurementSummary({
        suite_ids: selectedSuiteIds,
        case_filter: caseFilter,
        repeat_count: repeatCount as number,
        product_id: productId,
      });
      setSummary(result);
    } catch (err: unknown) {
      const budgetInfo = extractBudgetExceeded(err);
      if (budgetInfo) {
        setBudgetExceeded(budgetInfo);
      } else if (err instanceof Error) {
        setSummaryError(err.message || "Gagal memuat ringkasan pengukuran.");
      } else {
        setSummaryError("Gagal memuat ringkasan pengukuran.");
      }
    } finally {
      setIsSummaryLoading(false);
    }
  }

  async function handleStart() {
    /* v8 ignore next */
    if (!label.trim() || selectedSuiteIds.length === 0 || !productId) return;

    setIsStarting(true);
    setStartError(null);

    try {
      const payload: StartMeasurementRequest = {
        suite_ids: selectedSuiteIds,
        case_filter: caseFilter,
        repeat_count: repeatCount as number,
        product_id: productId,
        label: label.trim(),
        purpose,
      };

      const res = await startMeasurement(payload);
      showToast("Sesi pengukuran berhasil dibuat");
      setIsConfirmOpen(false);
      if (res?.session_id) {
        router.push(`/runs/${res.session_id}`);
      } else {
        router.push("/runs");
      }
    } catch (err: unknown) {
      const budgetInfo = extractBudgetExceeded(err);
      if (budgetInfo) {
        setBudgetExceeded(budgetInfo);
        setIsConfirmOpen(false);
      } else if (err instanceof Error) {
        setStartError(err.message || "Gagal memulai pengukuran.");
      } else {
        setStartError("Gagal memulai pengukuran.");
      }
    } finally {
      setIsStarting(false);
    }
  }

  const hasValidRepeat =
    typeof repeatCount === "number" && repeatCount >= 1 && repeatCount <= 5;
  const canRequestSummary =
    selectedSuiteIds.length > 0 && Boolean(productId) && hasValidRepeat;
  const canStart =
    label.trim().length > 0 &&
    selectedSuiteIds.length > 0 &&
    Boolean(productId) &&
    hasValidRepeat &&
    summary !== null &&
    budgetExceeded === null &&
    !isSummaryLoading &&
    !isStarting;

  return (
    <div className="space-y-6">
      {/* Langkah 1: Informasi Sesi */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            1. Informasi Sesi
          </h2>
          <p className="text-xs text-slate-500">
            Nama pengenal sesi dan penanda tujuan pengukuran.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor={labelId} className="block text-sm font-medium text-slate-700">
              Nama / Label Sesi <span className="text-red-500">*</span>
            </label>
            <input
              id={labelId}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={200}
              placeholder="Contoh: Evaluasi Gemini Flash vs Putusan MA 2026"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1 text-xs text-slate-400">Maksimal 200 karakter.</p>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">
              Tujuan Sesi <span className="text-red-500">*</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-4">
              {(["official", "trial"] as const).map((p) => (
                <label
                  key={p}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    purpose === p
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="purpose"
                    value={p}
                    checked={purpose === p}
                    onChange={() => setPurpose(p)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{MEASUREMENT_PURPOSE_LABEL[p]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Langkah 2: Suite & Filter Kasus */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              2. Pilih Suite Kasus & Filter
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
                Hapus Pilihan
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
              <div
                data-testid="suites-loading"
                className="rounded-md border border-slate-200 p-4 text-center text-sm text-slate-500"
              >
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 align-middle"
                />
                <span>Memuat daftar suite…</span>
              </div>
            )}

            {activeSuites.status === "error" && (
              <div
                data-testid="suites-error"
                className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex justify-between items-center"
              >
                <span>Gagal memuat suite aktif.</span>
                <button
                  type="button"
                  onClick={activeSuites.reload}
                  className="font-semibold underline hover:text-red-900"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {activeSuites.status === "ready" && activeSuites.suites.length === 0 && (
              <p
                data-testid="suites-empty"
                className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500"
              >
                Belum ada suite aktif yang tersedia.
              </p>
            )}

            {activeSuites.status === "ready" && activeSuites.suites.length > 0 && (
              <div
                data-testid="suites-list"
                className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-300 bg-white"
              >
                {activeSuites.suites.map((suite) => {
                  const checked = selectedSuiteIds.includes(suite.id);
                  return (
                    <label
                      key={suite.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleSuiteToggle(suite.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="flex-1 font-medium text-slate-900">
                        {suite.name}
                      </span>
                    </label>
                  );
                })}
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
            <div className="mt-2 flex flex-wrap gap-4">
              {(["both", "dev", "test"] as const).map((cf) => (
                <label
                  key={cf}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    caseFilter === cf
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="caseFilter"
                    value={cf}
                    checked={caseFilter === cf}
                    onChange={() => {
                      invalidateSummary();
                      setCaseFilter(cf);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{CASE_FILTER_LABEL[cf]}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Hanya kasus yang sudah disetujui (Approved) dan bertag sesuai filter yang akan diuji.
            </p>
          </div>
        </div>
      </section>

      {/* Langkah 3: Pilih Produk AI Otomatis */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            3. Pilih Produk AI Otomatis
          </h2>
          <p className="text-xs text-slate-500">
            Hanya produk AI aktif berjenis Otomatis yang dapat diuji (AC1).
          </p>
        </header>

        <div>
          <ProductSelect
            purpose="automatic_run"
            value={productId}
            onChange={(val) => {
              invalidateSummary();
              setProductId(val);
            }}
            required
            label="Pilih Produk AI"
          />
        </div>
      </section>

      {/* Langkah 4: Pengulangan & Penilai LLM */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            4. Pengulangan & Penilai LLM
          </h2>
          <p className="text-xs text-slate-500">
            Setiap kasus akan dikirim sebanyak jumlah pengulangan sebagai percakapan baru.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="repeat-count-input" className="block text-sm font-medium text-slate-700">
              Jumlah Pengulangan (1–5) <span className="text-red-500">*</span>
            </label>
            <input
              id="repeat-count-input"
              type="number"
              min={1}
              max={5}
              value={repeatCount}
              onChange={(e) => {
                invalidateSummary();
                const raw = e.target.value;
                if (raw === "") {
                  setRepeatCount("");
                  return;
                }
                let val = Number.parseInt(raw, 10);
                if (raw.length > 1) {
                  const lastDigit = Number.parseInt(raw.slice(-1), 10);
                  if (lastDigit >= 1 && lastDigit <= 5) {
                    val = lastDigit;
                  }
                }
                setRepeatCount(Math.min(5, Math.max(1, val)));
              }}
              onBlur={() => {
                if (repeatCount === "") {
                  setRepeatCount(3);
                }
              }}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1 text-xs text-slate-500">Standar 3 kali (rentang 1 sampai 5).</p>

            {repeatCount === 1 && (
              <div
                data-testid="repeat-single-warning"
                className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800"
              >
                <strong>Catatan:</strong> 1x pengulangan disarankan hanya jika model berjalan
                dalam mode deterministik (temperature 0).
              </div>
            )}
          </div>

          <div>
            <label htmlFor="judge-provider-select" className="block text-sm font-medium text-slate-700">
              Provider Penilai (LLM Judge) <span className="text-red-500">*</span>
            </label>
            <select
              id="judge-provider-select"
              value={judgeProviderId}
              onChange={(e) => setJudgeProviderId(e.target.value as JudgeProvider)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              {JUDGE_PROVIDER_OPTIONS.map((judge) => (
                <option key={judge.value} value={judge.value}>
                  {judge.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Biaya LLM judge dicatat pada anggaran penilai terpisah.
            </p>
          </div>
        </div>
      </section>

      {/* Langkah 5: Ringkasan & Perkiraan Biaya */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <header className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              5. Ringkasan & Perkiraan Biaya
            </h2>
            <p className="text-xs text-slate-500">
              Tinjau perkiraan biaya sebelum menekan Mulai (AC5).
            </p>
          </div>
          <button
            type="button"
            onClick={handleFetchSummary}
            disabled={!canRequestSummary || isSummaryLoading}
            className="rounded-md border border-indigo-600 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSummaryLoading ? "Menghitung…" : "Tinjau Ringkasan Biaya"}
          </button>
        </header>

        <MeasurementSummaryCard
          summary={summary}
          budgetExceeded={budgetExceeded}
          errorMessage={summaryError}
          isLoading={isSummaryLoading}
        />
      </section>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => router.push("/runs")}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={!canStart}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mulai Pengukuran
        </button>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div
          data-testid="modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <dialog
            open
            aria-modal="true"
            data-testid="start-confirm-dialog"
            className="relative m-0 w-full max-w-md space-y-4 rounded-lg border-0 bg-white p-6 shadow-xl text-slate-900"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              Konfirmasi Mulai Pengukuran
            </h3>

            {summary && (
              <p className="text-sm text-slate-600">
                Pengukuran <strong className="text-slate-900">&quot;{label.trim()}&quot;</strong> akan
                dijalankan sebanyak{" "}
                <strong>{summary.total_calls} panggilan</strong> ({summary.case_count} kasus × {repeatCount} pengulangan). Sesi akan
                masuk ke antrean eksekusi sistem.
              </p>
            )}

            {startError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                {startError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isStarting}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={isStarting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isStarting ? "Memulai…" : "Ya, Mulai Pengukuran"}
              </button>
            </div>
          </dialog>
        </div>
      )}
    </div>
  );
}
