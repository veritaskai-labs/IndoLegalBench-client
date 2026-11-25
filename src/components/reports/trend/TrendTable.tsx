import { formatScore } from "@/lib/grading/scoreFormat";
import { monthLabel } from "@/lib/reports/trend/trendChart";
import { pointNotes } from "@/lib/reports/trend/trendRules";
import type { TrendPointRead } from "@/types/reports";

const HEADERS = ["Bulan", "Sesi", "Skor", "Kasus yang sama", "Catatan"] as const;

/**
 * Angka yang sama dengan grafik, dalam bentuk tabel. Grafiknya disembunyikan dari pembaca layar, jadi tabel inilah
 * yang memuat skor, jumlah kasus yang sama, alasan garis diputus, dan penanda tiap bulan (PBI-17 AC5).
 */
export function TrendTable({ points, caption }: Readonly<{ points: readonly TrendPointRead[]; caption: string }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm text-slate-800">
        <caption className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-600">
          {caption}
        </caption>
        <thead className="text-xs text-slate-500">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {points.map((point) => (
            <PointRow key={point.month} point={point} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PointRow({ point }: Readonly<{ point: TrendPointRead }>) {
  const notes = pointNotes(point);
  return (
    <tr>
      <td className="px-3 py-2 whitespace-nowrap">{monthLabel(point.month)}</td>
      <td className="px-3 py-2">{point.label}</td>
      <td className="px-3 py-2 tabular-nums">{formatScore(point.value)}</td>
      <td className="px-3 py-2 tabular-nums">{point.case_count}</td>
      <td className="px-3 py-2">
        {notes.length === 0 ? (
          "–"
        ) : (
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}
