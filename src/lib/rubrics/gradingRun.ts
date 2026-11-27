import { formatWib } from "@/lib/datetime/formatWib";
import { formatRupiah } from "@/lib/providers/format";
import type { GradingJudge, SessionGradingResponse } from "@/types/grading";

/**
 * Yang dibutuhkan satu baris: hasil penuh (GET /results) maupun ringkasan riwayat
 * (GET /grading-runs) memenuhinya, jadi daftar riwayat memakai pembuat baris yang sama.
 */
export type RunSource = Pick<
  SessionGradingResponse,
  "grading_run_id" | "kind" | "status" | "rubric_version" | "triggered_at" | "is_latest" | "judge"
>;

/** Satu baris hasil penilaian sesi (PBI-14 AC7), siap tampil tanpa logika di komponen. */
export interface RunRow {
  id: string;
  kindLabel: string;
  statusLabel: string;
  versionLabel: string;
  triggeredAt: string;
  isLatest: boolean;
  /** Judge yang menilai run ini (K-17), mis. "DeepSeek · deepseek-chat". */
  judgeLabel: string;
  /** Total biaya panggilan judge yang tercatat, mis. "Rp 1.166"; null bila tidak ada yang tercatat. */
  cost: string | null;
  /** "Penilaian N" (SCRUM-375 C5): urutan menurut waktu, yang pertama 1. */
  number: number;
  /** Hanya "completed" yang dianggap selesai; status lain tidak boleh tampil hijau. */
  isCompleted: boolean;
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
export function versionText(label: string): string {
  const match = /^v(\d+)$/.exec(label);
  return match === null ? label : `Versi ${match[1]}`;
}

/** Run sebelum server#134 tidak membawa judge; nama bisa hilang bila produknya dihapus. */
function judgeText(judge: GradingJudge | null | undefined): string {
  if (judge === null || judge === undefined) return "Penilai tidak tercatat";
  const name = judge.name ?? "Penilai tanpa nama";
  return judge.model_version ? `${name} · ${judge.model_version}` : name;
}

/**
 * Jumlah biaya yang tercatat, bukan total pasti: server menjumlahkan hanya panggilan yang punya biaya
 * (review server#134), jadi panggilan judge yang gagal tanpa biaya tidak ikut.
 */
function costText(judge: GradingJudge | null | undefined): string | null {
  const cost = judge?.cost_idr;
  return cost === null || cost === undefined ? null : formatRupiah(cost);
}

/** number hanya diketahui dari seluruh riwayat; satu run tanpa riwayat dianggap yang pertama. */
export function toRunRow(run: RunSource, number = 1): RunRow {
  return {
    id: run.grading_run_id,
    kindLabel: KIND_LABEL[run.kind],
    statusLabel: STATUS_LABEL[run.status] ?? run.status,
    versionLabel: versionText(run.rubric_version),
    triggeredAt: formatWib(run.triggered_at),
    isLatest: run.is_latest ?? true,
    judgeLabel: judgeText(run.judge),
    cost: costText(run.judge),
    number,
    isCompleted: run.status === "completed",
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

/** Terbaru di atas, bernomor menurut umur (yang terlama 1). Salinan dan sort yang stabil. */
export function toRunRows(runs: RunSource[]): RunRow[] {
  return [...runs].sort(newestFirst).map((run, index) => toRunRow(run, runs.length - index));
}

/** Keterangan di atas skor saat yang tampil adalah run lama, supaya tidak dikira hasil terbaru. */
export function olderRunNote(triggeredAt: string): string {
  return `Menampilkan hasil penilaian ${formatWib(triggeredAt)}, bukan yang terbaru.`;
}
