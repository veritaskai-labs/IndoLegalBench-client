import { EmptyState } from "@/components/ui";
import { sortNewestFirst, toVersionRow } from "@/lib/rubrics/rubricVersion";
import type { RubricVersionSummary } from "@/types/rubric";

const COLUMNS = ["Versi", "Berlaku sejak", "Dibuat oleh", "Penyetuju", "Status"];

/**
 * Daftar versi rubrik, read-only (PBI-14 AC7): versi tidak pernah diubah di tempat, perubahan
 * adalah versi baru lewat form. Semua teks tampil datang dari toVersionRow, jadi komponen ini
 * hanya merender dan tidak memutuskan apa pun.
 */
export function RubricVersionList({ versions }: Readonly<{ versions: RubricVersionSummary[] }>) {
  const rows = sortNewestFirst(versions).map(toVersionRow);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table aria-label="Versi rubrik" className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <EmptyState
              inTable
              colSpan={COLUMNS.length}
              title="Belum ada versi rubrik"
              description="Buat versi pertama lewat form di bawah, atau mulai dari template rubrik v1."
            />
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
              <td className="px-4 py-3 text-slate-700">{row.effectiveDate}</td>
              <td className="px-4 py-3 text-slate-700">{row.createdBy}</td>
              <td className="px-4 py-3 text-slate-700">{row.approver}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                >
                  {row.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
