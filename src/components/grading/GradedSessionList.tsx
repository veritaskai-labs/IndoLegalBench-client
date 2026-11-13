import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatWib } from "@/lib/datetime/formatWib";
import { judgeLabel, reportRunHref, reportRunStatusLabel } from "@/lib/grading/gradingRules";
import type { GradedRunListItem } from "@/types/grading";

const HEADERS = ["Sesi", "Produk", "LLM judge", "Versi rubrik", "Dinilai", "Status"];
const NO_VALUE = "–";

/**
 * Daftar hasil penilaian di Laporan, satu baris per grading run (PBI-14 AC8, PBI-22 AC9, K-21):
 * nilai ulang menambah baris dan baris lama tetap ada, jadi judge dan versi rubrik bisa dibedakan.
 * Komponen murni: data dan muat ulang datang dari useGradedSessions, aturan label dan link di
 * gradingRules, dan server yang menyaring sesi serta peran. Label sesi membuka run itu, bukan
 * selalu run terbaru. Di layar sempit tabel bergeser ke samping.
 */
export function GradedSessionList({
  sessions,
}: Readonly<{ sessions: AsyncResource<GradedRunListItem[]> & { reload: () => void } }>) {
  if (sessions.status === "loading") return <LoadingState />;
  if (sessions.status === "error") return <ErrorState variant="card" message={sessions.message} onRetry={sessions.reload} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <caption className="sr-only">Hasil penilaian per run</caption>
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="px-4 py-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sessions.data.length === 0 && (
            <EmptyState
              inTable
              colSpan={HEADERS.length}
              title="Belum ada sesi yang dinilai."
              description="Sesi tampil di sini setelah selesai dan dinilai Admin."
            />
          )}
          {sessions.data.map((item) => (
            <tr key={item.grading_run_id}>
              <td className="px-4 py-2">
                <Link href={reportRunHref(item)} className="font-medium text-indigo-700 hover:underline">
                  {item.label}
                </Link>
              </td>
              <td className="px-4 py-2 text-slate-700">{item.product_name}</td>
              <td className="px-4 py-2 text-slate-700">{judgeLabel(item.judge) ?? NO_VALUE}</td>
              <td className="px-4 py-2 text-slate-700">{item.rubric_version}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-700">{formatWib(item.graded_at)}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-700">{reportRunStatusLabel(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
