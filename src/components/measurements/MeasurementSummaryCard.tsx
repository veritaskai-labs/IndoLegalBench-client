import type { SummaryResponse } from "@/types/measurement";
import { CASE_FILTER_LABEL } from "@/types/measurement";
import { formatRupiah } from "@/lib/providers/format";
import type { BudgetExceededInfo } from "@/lib/measurements/measurementApi";

interface Props {
  summary: SummaryResponse | null;
  budgetExceeded?: BudgetExceededInfo | null;
  errorMessage?: string | null;
  isLoading?: boolean;
}

export function MeasurementSummaryCard({
  summary,
  budgetExceeded,
  errorMessage,
  isLoading = false,
}: Readonly<Props>) {
  if (isLoading) {
    return (
      <div
        data-testid="summary-loading"
        className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500"
      >
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 align-middle mr-2" />
        Menghitung perkiraan biaya dan memeriksa kelayakan kasus…
      </div>
    );
  }

  if (budgetExceeded) {
    return (
      <div
        data-testid="summary-budget-exceeded"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-2"
        role="alert"
      >
        <div className="flex items-center gap-2 font-semibold text-red-900">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Anggaran Produk Tidak Mencukupi</span>
        </div>
        <p>
          {budgetExceeded.productName
            ? `Perkiraan biaya melebihi sisa anggaran produk ${budgetExceeded.productName}.`
            : budgetExceeded.message}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          {budgetExceeded.remainingBudgetIdr && (
            <div>
              <span className="text-red-700">Sisa Anggaran Produk: </span>
              <strong className="font-semibold text-red-950">
                {formatRupiah(budgetExceeded.remainingBudgetIdr)}
              </strong>
            </div>
          )}
          {budgetExceeded.estimatedCostIdr && (
            <div>
              <span className="text-red-700">Perkiraan Biaya Pengukuran: </span>
              <strong className="font-semibold text-red-950">
                {formatRupiah(budgetExceeded.estimatedCostIdr)}
              </strong>
            </div>
          )}
        </div>
        <p className="text-xs text-red-700 pt-1">
          Pengukuran tidak dapat dijalankan. Kurangi pengulangan atau pilih produk lain.
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        data-testid="summary-error"
        className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        role="alert"
      >
        <p className="font-medium">{errorMessage}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        data-testid="summary-empty"
        className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500"
      >
        Pilih suite dan produk AI, lalu tinjau ringkasan untuk melihat perkiraan biaya.
      </div>
    );
  }

  return (
    <div
      data-testid="summary-card"
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        Ringkasan Pengukuran & Perkiraan Biaya
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded border border-slate-200 bg-white p-2.5">
          <p className="text-xs text-slate-500">Kasus Layak</p>
          <p className="text-base font-semibold text-slate-900">
            {summary.case_count} <span className="text-xs font-normal text-slate-600">kasus</span>
          </p>
        </div>

        <div className="rounded border border-slate-200 bg-white p-2.5">
          <p className="text-xs text-slate-500">Pengulangan per Kasus</p>
          <p className="text-base font-semibold text-slate-900">
            {summary.repeat_count}x
          </p>
        </div>

        <div className="rounded border border-slate-200 bg-white p-2.5">
          <p className="text-xs text-slate-500">Total Panggilan AI</p>
          <p className="text-base font-semibold text-indigo-700">
            {summary.total_calls} <span className="text-xs font-normal text-slate-600">panggilan</span>
          </p>
        </div>

        <div className="rounded border border-slate-200 bg-white p-2.5">
          <p className="text-xs text-slate-500">Filter Kasus</p>
          <p className="text-sm font-medium text-slate-900">
            {CASE_FILTER_LABEL[summary.case_filter] ?? summary.case_filter}
          </p>
        </div>

        <div className="rounded border border-slate-200 bg-white p-2.5">
          <p className="text-xs text-slate-500">Perkiraan Biaya (+margin 20%)</p>
          <p className="text-sm font-semibold text-emerald-700">
            {formatRupiah(summary.estimated_cost_idr)}
          </p>
        </div>

        <div className="rounded border border-slate-200 bg-white p-2.5">
          <p className="text-xs text-slate-500">Sisa Anggaran Produk</p>
          <p className="text-sm font-medium text-slate-800">
            {formatRupiah(summary.remaining_budget_idr)}
          </p>
        </div>
      </div>
    </div>
  );
}
