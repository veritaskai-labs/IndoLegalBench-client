import { ATTEMPT_STATUS_LABEL } from "@/lib/runs/sessionDetail";
import type { SplitTag } from "@/types/case";
import type { AttemptGradeResult, CaseGradeResult, ScorePair, ThreeScores } from "@/types/grading";
import { formatScore } from "./scoreFormat";

/** Record atas kunci kontrak: kelompok atau jalur baru dari server membuat tsc gagal di sini. */
export const SCORE_GROUP_LABEL: Record<keyof ThreeScores, string> = {
  dev: "Dev",
  test: "Test",
  combined: "Gabungan",
};

/**
 * Jalur deterministik, lalu dua aspek penilai LLM yang dilaporkan terpisah (server#114 bff8755,
 * SCRUM-225). Urutan di sini adalah urutan kolom di setiap tabel skor.
 */
export const SCORE_PATH_LABEL: Record<keyof ScorePair, string> = {
  deterministic: "Deterministik",
  quality: "Kualitas LLM",
  format: "Format LLM",
};

export type ScorePath = keyof ScorePair;

/** Tabel mengulang daftar ini, jadi jalur baru cukup ditambah di SCORE_PATH_LABEL. */
export const SCORE_PATHS = Object.keys(SCORE_PATH_LABEL) as ScorePath[];

export const MASKED_CASE_LABEL = "Kasus test disamarkan";

const NOT_GRADED_NOTE = "Tidak dinilai: gangguan teknis";

/** Setiap skor sudah berupa teks, satu per jalur. Tidak ada nilai gabungan (AC1). */
export type ScoreCells = Record<ScorePath, string>;

export interface AttemptRow {
  id: string;
  label: string;
  statusLabel: string;
  scored: boolean;
  scores: ScoreCells;
  note: string | null;
}

/** Satu baris tabel hasil, siap tampil tanpa logika di komponen. */
export interface CaseRow {
  id: string;
  code: string | null;
  title: string;
  splitTag: SplitTag | null;
  masked: boolean;
  scores: ScoreCells;
  attempts: AttemptRow[];
}

const NO_SCORE: ScoreCells = scoreCells(null);

/** Skor yang null atau tidak dikirim (semua field ScorePair opsional) tampil sebagai tanda pisah. */
export function scoreCells(pair: ScorePair | null | undefined): ScoreCells {
  return Object.fromEntries(SCORE_PATHS.map((path) => [path, formatScore(pair?.[path])])) as ScoreCells;
}

/**
 * Gangguan teknis (jawaban kosong, AI menolak, penilai gagal) tidak dinilai dan tidak menurunkan
 * skor (AC4). Skor yang tetap terbawa pada percobaan seperti itu tidak ditampilkan, supaya tidak
 * terlihat seolah dinilai.
 */
export function toAttemptRow(attempt: AttemptGradeResult): AttemptRow {
  const disrupted = attempt.is_technical_disruption;
  return {
    id: attempt.attempt_id,
    label: `Percobaan ${attempt.repetition_no}`,
    statusLabel: ATTEMPT_STATUS_LABEL[attempt.status],
    scored: !disrupted,
    scores: disrupted ? { ...NO_SCORE } : scoreCells(attempt.score),
    note: disrupted ? NOT_GRADED_NOTE : null,
  };
}

/**
 * Kasus test yang dilihat Developer AI hanya masuk ke skor agregat (AC8). Server sudah
 * menyamarkannya; di sini lapisan kedua: baris tersamar dibangun tanpa membaca isi kasus sama
 * sekali, jadi isi yang terbawa karena kesalahan server tetap tidak sampai ke tabel.
 */
export function toCaseRow(item: CaseGradeResult): CaseRow {
  const splitTag = item.split_tag ?? null;
  if (item.masked) {
    return {
      id: item.snapshot_item_id,
      code: null,
      title: MASKED_CASE_LABEL,
      splitTag,
      masked: true,
      scores: { ...NO_SCORE },
      attempts: [],
    };
  }

  return {
    id: item.snapshot_item_id,
    code: item.case_code,
    title: item.title,
    splitTag,
    masked: false,
    scores: scoreCells(item.scores),
    attempts: [...(item.attempts ?? [])].sort((a, b) => a.repetition_no - b.repetition_no).map(toAttemptRow),
  };
}
