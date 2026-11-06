import { toRunRows } from "@/lib/rubrics/gradingRun";
import type { GradingRun } from "@/types/rubric";

/**
 * Riwayat penilaian satu sesi (PBI-14 AC7). Nilai ulang menambah baris dan tidak menimpa, jadi
 * hasil lama tetap terlihat di sini; hanya yang terbaru bertanda. Teks tampil datang dari
 * toRunRows, komponen ini hanya merender.
 */
export function GradingHistoryList({ runs }: Readonly<{ runs: GradingRun[] }>) {
  const rows = toRunRows(runs);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada riwayat penilaian untuk sesi ini.</p>;
  }

  return (
    <ul aria-label="Riwayat penilaian" className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
          <span className="font-medium text-slate-900">{row.kindLabel}</span>
          <span className="text-slate-700">{row.versionLabel}</span>
          <span className="text-slate-500">{row.statusLabel}</span>
          <span className="text-slate-500">{row.triggeredAt}</span>
          <span className="text-slate-500">{`oleh ${row.triggeredBy}`}</span>
          {row.isLatest && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">Terbaru</span>
          )}
        </li>
      ))}
    </ul>
  );
}
