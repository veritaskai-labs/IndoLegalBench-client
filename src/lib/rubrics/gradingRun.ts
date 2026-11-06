import { formatWib } from "@/lib/datetime/formatWib";
import type { GradingRun, GradingRunKind, GradingRunStatus } from "@/types/rubric";

/** Satu baris riwayat penilaian sesi (PBI-14 AC7), siap tampil tanpa logika di komponen. */
export interface RunRow {
  id: string;
  kindLabel: string;
  statusLabel: string;
  versionLabel: string;
  triggeredAt: string;
  triggeredBy: string;
  isLatest: boolean;
}

/** Record atas tipe kontrak, bukan switch: jenis atau status baru dari server membuat tsc gagal di sini. */
const KIND_LABEL: Record<GradingRunKind, string> = {
  initial: "Nilai pertama",
  regrade: "Nilai ulang",
};

const STATUS_LABEL: Record<GradingRunStatus, string> = {
  queued: "Menunggu",
  running: "Berjalan",
  finished: "Selesai",
  failed: "Gagal",
};

export function toRunRow(run: GradingRun): RunRow {
  return {
    id: run.id,
    kindLabel: KIND_LABEL[run.kind],
    statusLabel: STATUS_LABEL[run.status],
    versionLabel: `Versi ${run.rubric_version_no}`,
    triggeredAt: formatWib(run.triggered_at),
    triggeredBy: run.triggered_by_name ?? "-",
    isLatest: run.is_latest,
  };
}

/** Waktu yang tidak terbaca diurutkan paling akhir, supaya tidak merusak urutan yang lain. */
function startedAt(run: GradingRun): number {
  const time = new Date(run.triggered_at).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function newestFirst(a: GradingRun, b: GradingRun): number {
  const first = startedAt(a);
  const second = startedAt(b);
  if (first === second) return 0;
  return second > first ? 1 : -1;
}

/** Terbaru di atas. Salinan dan sort yang stabil: yang sama waktunya tetap dalam urutan dari server. */
export function toRunRows(runs: GradingRun[]): RunRow[] {
  return [...runs].sort(newestFirst).map(toRunRow);
}
