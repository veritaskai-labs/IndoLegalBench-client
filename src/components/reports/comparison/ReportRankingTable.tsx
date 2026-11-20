import Link from "next/link";

import { formatScore } from "@/lib/grading/scoreFormat";
import { failureRateText, modelVersionText, rankText } from "@/lib/reports/reportCells";
import { measurementKindLabel, REPORT_LABELS, sessionMarkersText } from "@/lib/reports/reportLabels";
import type { ReportRow } from "@/lib/reports/reportSections";
import type { ProductLabelMode, ReportLanguage } from "@/types/reports";

const CELL = "px-3 py-2 align-top";
const NUMBER = `${CELL} text-right tabular-nums`;

/** Membuat tautan penelusuran untuk satu angka (PBI-16 AC1); tanpa ini, misalnya di pratinjau, angka hanya teks. */
export type ScoreHref = (resultId: string) => string;

/**
 * Satu sel skor. Dengan href, angkanya menjadi tautan ke kasus di balik angka itu (PBI-16 AC1, D6 langkah 1).
 * Skor kosong tampil sebagai tanda pisah (D1) dan tidak ditautkan: tidak ada angka yang bisa ditelusuri.
 */
export function ScoreCell({
  score,
  language,
  href,
  label,
}: Readonly<{ score: string | null; language: ReportLanguage; href?: string; label?: string }>) {
  const text = formatScore(score, language);
  if (!href || score === null) return <td className={NUMBER}>{text}</td>;
  return (
    <td className={NUMBER}>
      <Link href={href} aria-label={label} className="text-indigo-700 underline decoration-dotted underline-offset-2 hover:decoration-solid">
        {text}
      </Link>
    </td>
  );
}

/**
 * Tabel peringkat satu bagian laporan, sebelas kolom sama dengan PDF (Fase 0 K6), dalam bahasa laporan.
 * Baris sudah diurutkan reportSections. Di layar sempit tabel digeser di dalam wilayahnya sendiri; kolom
 * peringkat dan produk tetap terlihat. Semua teks dicetak React sebagai teks biasa.
 */
export function ReportRankingTable({
  rows,
  language,
  labelMode,
  caption,
  scoreHref,
}: Readonly<{
  rows: readonly ReportRow[];
  language: ReportLanguage;
  labelMode: ProductLabelMode;
  caption: string;
  scoreHref?: ScoreHref;
}>) {
  const labels = REPORT_LABELS[language];
  const [rank, product, ...rest] = labels.columns;

  return (
    // shortcut: no tabIndex (Sonar S6845); Chrome, Edge and Firefox focus a scroll box by keyboard, Safari does not, add a focusable wrapper if Safari users report it.
    <section aria-label={caption} className="overflow-x-auto rounded-lg border border-slate-200">

      <table className="w-full min-w-[980px] border-separate border-spacing-0 text-xs text-slate-800">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className={`${CELL} sticky left-0 z-10 w-12 bg-slate-50 text-left font-semibold`}>
              {rank}
            </th>
            <th scope="col" className={`${CELL} sticky left-12 z-10 min-w-24 bg-slate-50 text-left font-semibold`}>
              {product}
            </th>
            {rest.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`${CELL} font-semibold ${index >= 1 && index <= 6 ? "text-right" : "text-left"}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ session, result }) => (
            <tr key={session.product_label} className="border-t border-slate-100">
              <td className={`${CELL} sticky left-0 z-10 bg-white tabular-nums`}>{rankText(result.rank)}</td>
              <th scope="row" className={`${CELL} sticky left-12 z-10 bg-white text-left font-semibold`}>
                {session.product_label}
              </th>
              <td className={CELL}>{measurementKindLabel(session.measurement_kind, language)}</td>
              <ScoreCell
                score={result.det_score}
                language={language}
                href={scoreHref?.(result.id)}
                label={`Telusuri kasus di balik skor deterministik ${session.product_label}`}
              />
              <ScoreCell
                score={result.llm_score}
                language={language}
                href={scoreHref?.(result.id)}
                label={`Telusuri kasus di balik skor penilai LLM ${session.product_label}`}
              />
              <td className={NUMBER}>{result.cases_graded_count}</td>
              <td className={NUMBER}>{result.cases_basis_count}</td>
              <td className={NUMBER}>{failureRateText(session.measurement_kind, result.failure_rate, language)}</td>
              <td className={NUMBER}>{result.repetitions}</td>
              <td className={CELL}>{modelVersionText(result.product_model_version, labelMode, language)}</td>
              <td className={CELL}>{sessionMarkersText(session, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
