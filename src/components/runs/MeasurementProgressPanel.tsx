import { formatWib } from "@/lib/datetime/formatWib";
import { formatRupiah, formatRupiahDown } from "@/lib/providers/format";
import {
  budgetExhausted,
  callCountText,
  failedText,
  percentText,
  progressBarPercent,
  remainingTimeText,
  startedAtText,
} from "@/lib/runs/sessionProgress";
import type { MeasurementProgress } from "@/types/measurement";

/**
 * Layar progres satu pengukuran (PBI-12 AC5). Komponen murni: angkanya diberikan dari
 * luar, jadi polling 5 detik (AC6) tinggal mengganti props tanpa panel ini tahu apa pun
 * soal jaringan. Tidak menampilkan jumlah coba ulang berjalan maupun penanda produk
 * bermasalah, sesuai AC5.
 */
export function MeasurementProgressPanel({ progress }: Readonly<{ progress: MeasurementProgress }>) {
  const percent = progressBarPercent(progress.percent_complete);
  const facts: { label: string; value: string }[] = [
    { label: "Gagal", value: failedText(progress.failed_calls, progress.percent_failed) },
    { label: "Perkiraan sisa waktu", value: remainingTimeText(progress.remaining_seconds) },
    { label: "Biaya berjalan", value: formatRupiah(progress.running_cost_idr) },
    { label: "Sisa anggaran bulan ini", value: formatRupiahDown(progress.remaining_budget_idr) },
    { label: "Mulai", value: startedAtText(progress.started_at) },
    { label: "Terakhir diperbarui", value: formatWib(progress.updated_at) },
  ];

  return (
    <section aria-label="Progres pengukuran" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-lg font-semibold text-slate-900">{callCountText(progress.completed_calls, progress.total_calls)}</p>
        <p className="text-sm text-slate-500">{percentText(progress.percent_complete)}</p>
      </div>

      <div
        role="progressbar"
        aria-label="Persen selesai"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
      </div>

      {budgetExhausted(progress.remaining_budget_idr) && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Anggaran bulan ini sudah habis, jadi pengukuran otomatis dihentikan. Hasil yang sudah selesai tetap tersimpan.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:gap-x-6 lg:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs font-semibold text-slate-500">{fact.label}</dt>
            <dd className="mt-0.5 text-slate-900">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}