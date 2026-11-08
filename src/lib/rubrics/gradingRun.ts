import { formatWib } from "@/lib/datetime/formatWib";
import type { SessionGradingResponse } from "@/types/grading";

/**
 * Yang dibutuhkan satu baris: hasil penuh (GET /results) maupun ringkasan riwayat
 * (GET /grading-runs) memenuhinya, jadi daftar riwayat memakai pembuat baris yang sama.
 */
export type RunSource = Pick<
  SessionGradingResponse,
  "grading_run_id" | "kind" | "status" | "rubric_version" | "triggered_at" | "is_latest"
>;

/** Satu baris hasil penilaian sesi (PBI-14 AC7), siap tampil tanpa logika di komponen. */
export interface RunRow {
  id: string;
  kindLabel: string;
  statusLabel: string;
  versionLabel: string;
  triggeredAt: string;
  isLatest: boolean;
}

/** Record atas enum kontrak, bukan switch: jenis baru dari server membuat tsc gagal di sini. */
const KIND_LABEL: Record<SessionGradingResponse["kind"], string> = {
  initial: "Nilai pertama",
  regrade: "Nilai ulang",
};

/** status di kontrak berupa string bebas; hanya "completed" yang dikenal, sisanya tampil apa adanya. */
const STATUS_LABEL: Record<string, string> = {
  completed: "Selesai",
};

/** "v2" menjadi "Versi 2"; label yang bukan v<angka> tampil apa adanya. */
function versionText(label: string): string {
  const match = /^v(\d+)$/.exec(label);
  return match === null ? label : `Versi ${match[1]}`;
}

export function toRunRow(run: RunSource): RunRow {
  return {
    id: run.grading_run_id,
    kindLabel: KIND_LABEL[run.kind],
    statusLabel: STATUS_LABEL[run.status] ?? run.status,
    versionLabel: versionText(run.rubric_version),
    triggeredAt: formatWib(run.triggered_at),
    isLatest: run.is_latest ?? true,
  };
}

/** Waktu yang tidak terbaca diurutkan paling akhir, supaya tidak merusak urutan yang lain. */
function startedAt(run: RunSource): number {
  const time = new Date(run.triggered_at).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function newestFirst(a: RunSource, b: RunSource): number {
  const first = startedAt(a);
  const second = startedAt(b);
  if (first === second) return 0;
  return second > first ? 1 : -1;
}

/** Terbaru di atas. Salinan dan sort yang stabil: yang sama waktunya tetap dalam urutan masuk. */
export function toRunRows(runs: RunSource[]): RunRow[] {
  return [...runs].sort(newestFirst).map(toRunRow);
}
