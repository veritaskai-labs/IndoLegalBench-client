import { formatWib } from "@/lib/datetime/formatWib";
import { formatRupiah, formatRupiahDown } from "@/lib/providers/format";
import {
  budgetExhausted,
  callCountText,
  casesDoneText,
  failedText,
  remainingTimeText,
  startedAtText,
  wholePercent,
  wholePercentText,
} from "@/lib/runs/sessionProgress";
import type { MeasurementProgress } from "@/types/measurement";

/**
 * Layar progres satu pengukuran (PBI-12 AC5). Komponen murni: angkanya diberikan dari
 * luar, jadi polling 5 detik (AC6) tinggal mengganti props tanpa panel ini tahu apa pun
 * soal jaringan. Tidak menampilkan jumlah coba ulang berjalan maupun penanda produk
 * bermasalah, sesuai AC5.
 *
 * Judul dan bar memakai kasus selesai (SCRUM-266, feedback UAT): "7 dari 20 kasus", 35%.
 * Jumlah panggilan tidak dibuang, hanya pindah ke daftar fakta; gagal tetap per panggilan.
 */
export function MeasurementProgressPanel({ progress }: Readonly<{ progress: MeasurementProgress }>) {
  const percent = wholePercent(progress.percent_cases_complete);
  const facts: { label: string; value: string }[] = [
    { label: "Panggilan selesai", value: callCountText(progress.completed_calls, progress.total_calls) },
    { label: "Gagal", value: failedText(progress.failed_calls, progress.percent_failed) },
    { label: "Perkiraan sisa waktu", value: remainingTimeText(progress.remaining_seconds) },
    { label: "Biaya berjalan", value: formatRupiah(progress.running_cost_idr) },
    { label: "Sisa anggaran bulan ini", value: formatRupiahDown(progress.remaining_budget_idr) },
    { label: "Mulai", value: startedAtText(progress.started_at) },
    { label: "Terakhir diperbarui", value: formatWib(progress.updated_at) },
  ];

  return (
    <section aria-label="Progres pengukuran" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      {/* flex-wrap: on a phone the percentage moves under the count instead of being squeezed. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-lg font-semibold text-slate-900">
          {casesDoneText(progress.completed_cases, progress.total_cases)}
        </p>
        <p className="text-sm font-medium text-slate-700">{wholePercentText(progress.percent_cases_complete)}</p>
      </div>

      <progress
        value={percent}
        max={100}
        aria-label="Persen kasus selesai"
        className="h-2 w-full appearance-none overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-slate-900 [&::-moz-progress-bar]:bg-slate-900"
      />

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