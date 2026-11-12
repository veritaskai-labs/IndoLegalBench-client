import { toRunRows, type RunRow, type RunSource } from "@/lib/rubrics/gradingRun";

type Props = Readonly<{
  runs: RunSource[];
  /** Run yang skornya sedang tampil di bawah daftar. */
  selectedId?: string | null;
  /** Tanpa ini daftar hanya dibaca; dengan ini setiap baris bisa dipilih (K-17/K-18). */
  onSelect?: (runId: string) => void;
}>;

function RowContent({ row }: Readonly<{ row: RunRow }>) {
  return (
    <>
      <span className="font-medium text-slate-900">{row.kindLabel}</span>
      <span className="text-slate-700">{row.versionLabel}</span>
      <span className="text-slate-700">{row.judgeLabel}</span>
      <span className="text-slate-500">{row.statusLabel}</span>
      <span className="text-slate-500">{row.triggeredAt}</span>
      {row.costLabel !== null && <span className="text-slate-500">{row.costLabel}</span>}
      {row.isLatest && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">Terbaru</span>}
    </>
  );
}

const ROW = "flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm";

/**
 * Riwayat penilaian satu sesi (PBI-14 AC7): versi rubrik dan LLM judge tiap run (K-17). Nilai ulang
 * menambah baris dan tidak menimpa; hanya yang terbaru bertanda. Dengan onSelect, setiap baris
 * menjadi tombol untuk membuka run itu. Teks tampil datang dari toRunRows, komponen ini hanya merender.
 */
export function GradingHistoryList({ runs, selectedId = null, onSelect }: Props) {
  const rows = toRunRows(runs);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada hasil penilaian untuk sesi ini.</p>;
  }

  return (
    <ul aria-label="Riwayat penilaian" className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {rows.map((row) => (
        <li key={row.id}>
          {onSelect === undefined ? (
            <div className={ROW}>
              <RowContent row={row} />
            </div>
          ) : (
            <button
              type="button"
              aria-pressed={row.id === selectedId}
              onClick={() => onSelect(row.id)}
              className={`${ROW} hover:bg-slate-50 aria-pressed:bg-indigo-50/60`}
            >
              <RowContent row={row} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
