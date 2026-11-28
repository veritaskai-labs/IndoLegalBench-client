import { formatScore } from "@/lib/grading/scoreFormat";

import { toNumber } from "./reportChart";
import { REPORT_LABELS } from "./reportLabels";
import type { ReportRow } from "./reportSections";

export type HighlightMetric = "deterministic" | "llm" | "failureRate";

export type ReportHighlight = {
  metric: HighlightMetric;
  title: string;
  /** Produk dengan nilai terbaik; lebih dari satu bila seri. */
  leaders: string[];
  sentence: string;
};

type Entry = { product: string; value: number; text: string };

const LABELS = REPORT_LABELS.id;

/** "A", "A dan B", "A, B, dan C": cara menyebut daftar dalam kalimat Indonesia. */
function joinNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" dan ");
  return `${names.slice(0, -1).join(", ")}, dan ${names.at(-1)}`;
}

/**
 * Kelompok nilai dari yang terbaik: kelompok pertama juara (bisa seri), kelompok kedua runner-up. Nilai yang sama
 * dibandingkan sebagai angka, jadi "1.0" dan "1.00" seri. Urutan dalam kelompok mengikuti urutan peringkat server.
 */
function groupsByBest(entries: readonly Entry[], lowerIsBetter: boolean): Entry[][] {
  const values = [...new Set(entries.map((entry) => entry.value))].sort((a, b) => (lowerIsBetter ? a - b : b - a));
  return values.map((value) => entries.filter((entry) => entry.value === value));
}

function scoreEntries(rows: readonly ReportRow[], pick: (row: ReportRow) => string | null): Entry[] {
  return rows.flatMap((row) => {
    const raw = pick(row);
    const value = toNumber(raw);
    return value === null ? [] : [{ product: row.session.product_label, value, text: formatScore(raw) }];
  });
}

/** Kalimat juara, seri, dan runner-up, misalnya "A tertinggi dengan 0,91. Berikutnya B 0,87." */
function rankSentence(groups: readonly Entry[][], best: string, unit = ""): string {
  const [first, second] = groups;
  const names = first.map((entry) => entry.product);
  const value = `${first[0].text}${unit}`;
  if (names.length > 1) return `${joinNames(names)} seri di ${value}.`;
  const lead = `${names[0]} ${best} dengan ${value}.`;
  if (!second) return lead;
  return `${lead} Berikutnya ${joinNames(second.map((entry) => entry.product))} ${second[0].text}${unit}.`;
}

function scoreHighlight(
  rows: readonly ReportRow[],
  metric: "deterministic" | "llm",
  pick: (row: ReportRow) => string | null,
): ReportHighlight[] {
  const groups = groupsByBest(scoreEntries(rows, pick), false);
  if (groups.length === 0) return [];
  return [
    {
      metric,
      title: metric === "deterministic" ? LABELS.deterministic : LABELS.llm,
      leaders: groups[0].map((entry) => entry.product),
      sentence: rankSentence(groups, "tertinggi"),
    },
  ];
}

/**
 * Tingkat kegagalan teknis (AC2): makin rendah makin baik, dan tidak berlaku untuk produk manual, jadi produk
 * manual tidak ikut dibandingkan. Bila semua produk otomatis 0, kalimatnya menyebut itu, bukan juara seri.
 */
function failureHighlight(rows: readonly ReportRow[]): ReportHighlight[] {
  const automatic = rows.filter((row) => row.session.measurement_kind !== "manual");
  const entries = scoreEntries(automatic, (row) => row.result.failure_rate);
  const groups = groupsByBest(entries, true);
  if (groups.length === 0) return [];
  const leaders = groups[0].map((entry) => entry.product);
  const sentence =
    groups.length === 1 && groups[0][0].value === 0
      ? `Tidak ada kegagalan teknis pada ${entries.length} produk otomatis (${groups[0][0].text}%).`
      : rankSentence(groups, "paling rendah", "%");
  return [{ metric: "failureRate", title: LABELS.columns[7], leaders, sentence }];
}

/**
 * Kartu sorotan di atas tabel peringkat (SCRUM-346 A6, disetujui PO 25 Nov): satu kartu per angka yang dipisah PRD
 * (PBI-15 AC6), dihitung dari baris laporan yang sudah ada, tanpa data baru. Tidak ada skor target (AC7). Kartu
 * untuk angka yang tidak dimiliki produk mana pun tidak dibuat. Teks berbahasa Indonesia dengan koma desimal.
 */
export function reportHighlights(rows: readonly ReportRow[]): ReportHighlight[] {
  return [
    ...scoreHighlight(rows, "deterministic", (row) => row.result.det_score),
    ...scoreHighlight(rows, "llm", (row) => row.result.llm_score),
    ...failureHighlight(rows),
  ];
}
