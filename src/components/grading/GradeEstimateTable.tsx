import type { AsyncResource } from "@/hooks/useAsyncResource";
import { ErrorState } from "@/components/ui/ErrorState";
import { BUDGET_SHORT_TEXT, NO_ATTEMPTS_TEXT, type EstimateView } from "@/lib/grading/gradeEstimate";

/**
 * Tabel perkiraan biaya di dialog Nilai, Nilai ulang, dan Kirim untuk Dinilai (PBI-14 AC6).
 * Hanya menampilkan: isi baris dan aturan anggaran datang dari toEstimateView, dan keputusan
 * tombol mulai dari canStartGrading, jadi komponen ini tidak menghitung apa pun.
 */
export function GradeEstimateTable({
  estimate,
}: Readonly<{ estimate: AsyncResource<EstimateView | null> & { reload: () => void } }>) {
  if (estimate.status === "loading") {
    return (
      <output className="mt-3 flex items-center gap-2 text-sm text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        <span>Memuat perkiraan biaya…</span>
      </output>
    );
  }
  if (estimate.status === "error") {
    return <ErrorState message={estimate.message} onRetry={estimate.reload} className="mt-3" />;
  }
  if (estimate.data === null) return null;

  const { rows, budgetSufficient, hasAttempts } = estimate.data;
  return (
    <div className="mt-3 space-y-2">
      <table aria-label="Perkiraan biaya penilaian" className="w-full text-left text-sm">
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="py-1.5 pr-3 font-medium text-slate-600">
                {row.label}
              </th>
              <td className="py-1.5 text-right break-words text-slate-900">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!hasAttempts && <p className="text-sm text-slate-600">{NO_ATTEMPTS_TEXT}</p>}
      {!budgetSufficient && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {BUDGET_SHORT_TEXT}
        </p>
      )}
    </div>
  );
}
