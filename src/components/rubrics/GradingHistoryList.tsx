import { Badge } from "@/components/ui";
import { toRunRows, type RunRow, type RunSource } from "@/lib/rubrics/gradingRun";

type Props = Readonly<{
  runs: RunSource[];
  /** Run yang skornya sedang tampil di atas riwayat. */
  selectedId?: string | null;
  /** Tanpa ini riwayat hanya dibaca; dengan ini setiap baris bisa dipilih (K-17/K-18). */
  onSelect?: (runId: string) => void;
}>;

const DASH = "-";
const COLUMNS = ["Penilaian", "Versi rubrik", "Penilai LLM", "Status", "Dinilai", "Biaya"];

/** "Penilaian N" dengan jenisnya di bawah, jadi informasi Nilai pertama / Nilai ulang tetap ada. */
function RunName({ row, onSelect, selected }: Readonly<{ row: RunRow; onSelect?: (runId: string) => void; selected: boolean }>) {
  const name = (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-ink">{`Penilaian ${row.number}`}</span>
      {row.isLatest && <Badge tone="blue">Terbaru</Badge>}
    </span>
  );
  return (
    <div>
      {onSelect === undefined ? (
        name
      ) : (
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onSelect(row.id)}
          className="cursor-pointer rounded-tag text-left underline-offset-2 hover:underline aria-pressed:underline"
        >
          {name}
        </button>
      )}
      <span className="block text-xs text-muted">{row.kindLabel}</span>
    </div>
  );
}

function StatusBadge({ row }: Readonly<{ row: RunRow }>) {
  return (
    <Badge tone={row.isCompleted ? "green" : "gray"} dot>
      {row.statusLabel}
    </Badge>
  );
}

/**
 * Riwayat penilaian satu sesi (PBI-14 AC7, K-17): Nilai ulang menambah baris dan tidak menimpa, dan
 * hanya yang terbaru bertanda. SCRUM-375 C5: tabel berlabel (kartu di ponsel) menggantikan tujuh info
 * tanpa label dalam satu baris. Dengan onSelect, nama penilaian menjadi tombol untuk membuka run itu.
 * Teks tampil datang dari toRunRows; komponen ini hanya merender.
 */
export function GradingHistoryList({ runs, selectedId = null, onSelect }: Props) {
  const rows = toRunRows(runs);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">Belum ada hasil penilaian untuk sesi ini.</p>;
  }

  const note =
    onSelect === undefined
      ? "Setiap Nilai ulang menambah baris baru di atas. Skor di halaman ini selalu dari baris Terbaru."
      : "Setiap Nilai ulang menambah baris baru di atas. Pilih Penilaian untuk melihat skornya; tanpa pilihan, skor dari baris Terbaru.";

  return (
    <div className="space-y-2">
      <div className="hidden overflow-x-auto rounded-control border border-line bg-paper sm:block">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">Riwayat penilaian</caption>
          <thead className="bg-surface text-left text-ink-soft">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className={`whitespace-nowrap px-3 py-2 font-medium ${column === "Biaya" ? "text-right" : ""}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.id === selectedId ? "bg-surface-hover" : ""}>
                <td className="border-t border-line-soft px-3 py-2.5 align-top">
                  <RunName row={row} onSelect={onSelect} selected={row.id === selectedId} />
                </td>
                <td className="border-t border-line-soft px-3 py-2.5 align-top text-ink">{row.versionLabel}</td>
                <td className="border-t border-line-soft px-3 py-2.5 align-top text-ink">{row.judgeLabel}</td>
                <td className="border-t border-line-soft px-3 py-2.5 align-top">
                  <StatusBadge row={row} />
                </td>
                <td className="whitespace-nowrap border-t border-line-soft px-3 py-2.5 align-top text-muted">{row.triggeredAt}</td>
                <td className="whitespace-nowrap border-t border-line-soft px-3 py-2.5 text-right align-top tabular-nums text-ink">
                  {row.cost ?? DASH}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label="Riwayat penilaian" className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="space-y-1 rounded-control border border-line bg-paper p-3 text-[13px]">
            <div className="flex items-start justify-between gap-2">
              <RunName row={row} onSelect={onSelect} selected={row.id === selectedId} />
              <StatusBadge row={row} />
            </div>
            <p className="text-ink">{`${row.versionLabel} · ${row.judgeLabel}`}</p>
            <p className="text-muted">{`${row.triggeredAt} · ${row.cost ?? DASH}`}</p>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">{note}</p>
    </div>
  );
}
