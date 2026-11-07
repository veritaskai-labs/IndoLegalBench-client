import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatWib } from "@/lib/datetime/formatWib";
import type { GradedSessionListItem } from "@/types/grading";

const COLUMNS = 4;
const NO_VALUE = "–";

/**
 * Daftar sesi selesai yang sudah dinilai di Laporan (PBI-14 AC8, keputusan PO). Komponen murni:
 * data dan muat ulang datang dari useGradedSessions, dan server yang menyaring sesi serta peran.
 * Label sesi membuka hasilnya di /reports/sessions/[id]; id di-encode karena berasal dari server.
 */
export function GradedSessionList({
  sessions,
}: Readonly<{ sessions: AsyncResource<GradedSessionListItem[]> & { reload: () => void } }>) {
  if (sessions.status === "loading") return <LoadingState />;
  if (sessions.status === "error") return <ErrorState variant="card" message={sessions.message} onRetry={sessions.reload} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <caption className="sr-only">Sesi yang sudah dinilai</caption>
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-2">
              Sesi
            </th>
            <th scope="col" className="px-4 py-2">
              Produk
            </th>
            <th scope="col" className="px-4 py-2">
              Selesai
            </th>
            <th scope="col" className="px-4 py-2">
              Versi rubrik
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sessions.data.length === 0 && (
            <EmptyState
              inTable
              colSpan={COLUMNS}
              title="Belum ada sesi yang dinilai."
              description="Sesi tampil di sini setelah selesai dan dinilai Admin."
            />
          )}
          {sessions.data.map((item) => (
            <tr key={item.session_id}>
              <td className="px-4 py-2">
                <Link
                  href={`/reports/sessions/${encodeURIComponent(item.session_id)}`}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {item.label}
                </Link>
              </td>
              <td className="px-4 py-2 text-slate-700">{item.product_name}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-700">
                {item.finished_at ? formatWib(item.finished_at) : NO_VALUE}
              </td>
              <td className="px-4 py-2 text-slate-700">{item.rubric_version ?? NO_VALUE}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
