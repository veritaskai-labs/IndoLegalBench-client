"use client";

import { useId, useRef, useState } from "react";
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
  MeasurementPurpose,
  StartMeasurementRequest,
  SummaryResponse,
} from "@/types/measurement";
import {
  CASE_FILTER_LABEL,
  MEASUREMENT_PURPOSE_LABEL,
} from "@/types/measurement";

function openAsModal(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

export function CreateMeasurementForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const activeSuites = useSuites("active");

  // Step 1: Informasi Sesi
  const labelId = useId();
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState<MeasurementPurpose | "">("");

  // Step 2: Suite & Filter Kasus
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<string[]>([]);
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("both");

  // Step 3: Produk AI Otomatis
  const [productId, setProductId] = useState("");

  // Step 4: Pengulangan & Penilai LLM
  const [repeatCount, setRepeatCount] = useState<number | "">(3);
  const hasValidRepeat =
    typeof repeatCount === "number" && repeatCount >= 1 && repeatCount <= 5;

  // Step 5: Summary & Error State
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [budgetExceeded, setBudgetExceeded] = useState<BudgetExceededInfo | null>(null);
  const summaryRequestIdRef = useRef(0);

  // Step 6: Confirmation Dialog & Starting
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Invalidate summary if relevant inputs change
  function invalidateSummary() {
    summaryRequestIdRef.current += 1;
    setIsSummaryLoading(false);
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
    if (selectedSuiteIds.length === 0 || !productId || !hasValidRepeat) return;

    const currentRequestId = ++summaryRequestIdRef.current;
    setIsSummaryLoading(true);
    setSummaryError(null);
    setBudgetExceeded(null);

    try {
      const result = await getMeasurementSummary({
        suite_ids: selectedSuiteIds,
        case_filter: caseFilter,
        repeat_count: repeatCount,
        product_id: productId,
      });
      if (summaryRequestIdRef.current === currentRequestId) {
        setSummary(result);
      }
    } catch (err: unknown) {
      if (summaryRequestIdRef.current === currentRequestId) {
        const budgetInfo = extractBudgetExceeded(err);
        if (budgetInfo) {
          setBudgetExceeded(budgetInfo);
        } else if (err instanceof Error) {
          setSummaryError(err.message || "Gagal memuat ringkasan pengukuran.");
        } else {
          setSummaryError("Gagal memuat ringkasan pengukuran.");
        }
      }
    } finally {
      if (summaryRequestIdRef.current === currentRequestId) {
        setIsSummaryLoading(false);
      }
    }
  }

  async function handleStart() {
    /* v8 ignore next */
    if (!label.trim() || selectedSuiteIds.length === 0 || !productId || !purpose || !hasValidRepeat) return;

    setIsStarting(true);
    setStartError(null);

    try {
      const payload: StartMeasurementRequest = {
        suite_ids: selectedSuiteIds,
        case_filter: caseFilter,
        repeat_count: repeatCount,
        product_id: productId,
        label: label.trim(),
        purpose,
        judge_provider_id: null,
      };

      const res = await startMeasurement(payload);
      showToast("Sesi pengukuran berhasil dibuat");
      setIsConfirmOpen(false);
      router.push(`/runs/${res.session_id}`);
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

  const canRequestSummary =
    selectedSuiteIds.length > 0 && Boolean(productId) && hasValidRepeat;
  const canStart =
    label.trim().length > 0 &&
    selectedSuiteIds.length > 0 &&
    Boolean(productId) &&
    Boolean(purpose) &&
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={labelId} className="block text-sm font-medium text-slate-700">
              Nama / Label Sesi <span className="text-red-500">*</span>
            </label>
            <input
              id={labelId}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Evaluasi Perdata v1.2"
              maxLength={200}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1 text-xs text-slate-500">Maksimal 200 karakter.</p>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">
              Tujuan Sesi <span className="text-red-500">*</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-3">
              {(["official", "trial"] as const).map((p) => {
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
                Pilih tujuan sesi untuk mengaktifkan tombol mulai.
              </p>
            )}
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
                  className="font-medium underline hover:text-red-900"
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
                Tidak ada suite aktif yang tersedia.
              </p>
            )}

            {activeSuites.status === "ready" && activeSuites.suites.length > 0 && (
              <div
                data-testid="suites-list"
                className="max-h-48 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100"
              >
                {activeSuites.suites.map((suite) => {
                  const isChecked = selectedSuiteIds.includes(suite.id);
                  return (
                    <label
                      key={suite.id}
                      className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
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
            <div className="mt-2 flex flex-wrap gap-3">
              {(["both", "dev", "test"] as const).map((cf) => {
                const isSelected = caseFilter === cf;
                return (
                  <button
                    key={cf}
                    type="button"
                    onClick={() => {
                      invalidateSummary();
                      setCaseFilter(cf);
                    }}
                    aria-pressed={isSelected}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {CASE_FILTER_LABEL[cf]}
                  </button>
                );
              })}
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
            label="Pilih Produk AI"
            purpose="automatic_run"
            value={productId}
            onChange={(id) => {
              invalidateSummary();
              setProductId(id);
            }}
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
                  if (!Number.isNaN(lastDigit) && lastDigit >= 1 && lastDigit <= 5) {
                    val = lastDigit;
                  }
                }
                setRepeatCount(Number.isNaN(val) ? 3 : Math.min(5, Math.max(1, val)));
              }}
              onBlur={() => {
                if (
                  repeatCount === "" ||
                  typeof repeatCount !== "number" ||
                  Number.isNaN(repeatCount)
                ) {
                  setRepeatCount(3);
                }
              }}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1 text-xs text-slate-500">Standar 3 kali (rentang 1 sampai 5).</p>

            {hasValidRepeat && repeatCount === 1 && (
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
              Provider Penilai (LLM Judge)
            </label>
            <select
              id="judge-provider-select"
              disabled
              value="default"
              className="mt-1 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            >
              <option value="default">
                DeepSeek V4-Flash (Default)
              </option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Provider penilai khusus akan dikonfigurasi pada PBI-14. Saat ini otomatis menggunakan penilai default sistem.
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
            className="rounded-md border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-xs hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSummaryLoading ? "Menghitung…" : "Tinjau Ringkasan Biaya"}
          </button>
        </header>

        <MeasurementSummaryCard
          summary={summary}
          isLoading={isSummaryLoading}
          errorMessage={summaryError}
          budgetExceeded={budgetExceeded}
        />
      </section>

      {/* Tombol Aksi Bawah */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => router.push("/runs")}
          className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
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
        <dialog
          ref={openAsModal}
          onCancel={(e) => {
            e.preventDefault();
            if (!isStarting) {
              setIsConfirmOpen(false);
            }
          }}
          aria-labelledby="confirm-modal-title"
          data-testid="start-confirm-dialog"
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-slate-900/40 space-y-4"
        >
          <h3 id="confirm-modal-title" className="text-lg font-semibold text-slate-900">
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
      )}
    </div>
  );
}
