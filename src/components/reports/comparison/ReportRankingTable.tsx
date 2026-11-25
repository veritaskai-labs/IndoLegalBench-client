"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { formatScore } from "@/lib/grading/scoreFormat";
import { failureRateText, productSubline, rankText } from "@/lib/reports/reportCells";
import { COLUMN_GUIDE, type GuideKey } from "@/lib/reports/reportGuide";
import { REPORT_LABELS, sessionMarkerList } from "@/lib/reports/reportLabels";
import type { ReportRow } from "@/lib/reports/reportSections";
import type { ProductLabelMode, ReportLanguage } from "@/types/reports";

import { InfoTip } from "./InfoTip";

const CELL = "px-3 py-2.5 align-middle";
const NUMBER = `${CELL} text-right tabular-nums`;
const HEAD = "h-9 whitespace-nowrap bg-surface px-3 py-2 font-medium text-ink-soft";

/** Membuat tautan penelusuran untuk satu angka (PBI-16 AC1); tanpa ini, misalnya di pratinjau, angka hanya teks. */
export type ScoreHref = (resultId: string) => string;

/**
 * Satu sel skor. Dengan href, angkanya menjadi tautan ke kasus di balik angka itu (PBI-16 AC1, D6 langkah 1).
 * Skor kosong tampil sebagai tanda pisah (D1) dan tidak ditautkan: tidak ada angka yang bisa ditelusuri.
 * Nama tautan diawali angka yang terlihat (WCAG 2.5.3 Label in Name), lalu petunjuk sr-only berbahasa Indonesia
 * dengan lang="id", supaya tidak dibaca suara Inggris di laporan berbahasa Inggris (review #104).
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
      <Link href={href} className="text-accent-ink underline decoration-dotted underline-offset-2 hover:decoration-solid">
        {text}
        {label && (
          <span className="sr-only" lang="id">
            , telusuri kasus di balik {label}
          </span>
        )}
      </Link>
    </td>
  );
}

/** Kolom header: indeks label di REPORT_LABELS.columns (urutan PDF), penjelasan, dan apakah dilipat. */
type Column = { index: number; guide?: GuideKey; number?: boolean; extra?: boolean };

const COLUMNS: readonly Column[] = [
  { index: 3, guide: "deterministic", number: true },
  { index: 4, guide: "llm", number: true },
  { index: 5, guide: "graded", number: true },
  { index: 6, number: true, extra: true },
  { index: 7, guide: "failureRate", number: true },
  { index: 8, number: true, extra: true },
  { index: 10, guide: "markers" },
];

function HeaderLabel({ label, guide }: Readonly<{ label: string; guide?: GuideKey }>) {
  return (
    <span className="inline-flex items-center gap-1">
      <span data-column-label>{label}</span>
      {guide && <InfoTip label={COLUMN_GUIDE[guide].term} text={COLUMN_GUIDE[guide].text} />}
    </span>
  );
}

function MarkerBadges({ row, language }: Readonly<{ row: ReportRow; language: ReportLanguage }>) {
  return (
    <span className="flex flex-wrap gap-1">
      {row.session.is_trial && <Badge tone="amber">{REPORT_LABELS[language].trial}</Badge>}
      {sessionMarkerList(row.session, language).map((marker) => (
        <Badge key={marker}>{marker}</Badge>
      ))}
    </span>
  );
}

/**
 * Tabel peringkat satu bagian laporan (SCRUM-346 A1/A6, disetujui PO 25 Nov). Kolom inti yang selalu tampil
 * menurut PRD PBI-15: kedua skor terpisah, kasus dinilai, tingkat kegagalan, penanda; jenis pengukuran dan versi
 * model di bawah nama produk. Kasus dasar (juga tertulis di bawah judul) dan Percobaan dilipat di balik "Tampilkan
 * kolom lengkap". Ikon info di header menjelaskan kolomnya. Baris sudah diurutkan reportSections. Di layar sempit
 * tabel digeser di dalam wilayahnya sendiri; kolom peringkat dan produk tetap terlihat. PDF tetap sebelas kolom.
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
  const tableId = useId();
  const [full, setFull] = useState(false);
  const columns = COLUMNS.filter((column) => full || !column.extra);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          aria-expanded={full}
          aria-controls={tableId}
          onClick={() => setFull((current) => !current)}
          className="rounded-control border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-hover"
        >
          {full ? "Ringkas kolom" : "Tampilkan kolom lengkap"}
        </button>
      </div>
      {/* shortcut: no tabIndex (Sonar S6845); Chrome, Edge and Firefox focus a scroll box by keyboard, Safari does not, add a focusable wrapper if Safari users report it. */}
      <section aria-label={caption} className="overflow-x-auto rounded-control border border-line bg-paper">
        <table id={tableId} className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px] text-ink">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={`${HEAD} sticky left-0 z-10 w-24 text-left`}>
                <HeaderLabel label={labels.columns[0]} guide="rank" />
              </th>
              <th scope="col" className={`${HEAD} sticky left-24 z-10 min-w-36 text-left`}>
                <HeaderLabel label={labels.columns[1]} />
              </th>
              {columns.map((column) => (
                <th key={column.index} scope="col" className={`${HEAD} ${column.number ? "text-right" : "text-left"}`}>
                  <HeaderLabel label={labels.columns[column.index]} guide={column.guide} />
                </th>
              ))}
              {scoreHref && (
                <th scope="col" className={HEAD}>
                  <span className="sr-only">Kasus di balik angka</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { session, result } = row;
              const href = scoreHref?.(result.id);
              return (
                <tr key={result.id}>
                  <td className={`${CELL} sticky left-0 z-10 border-t border-line-soft bg-paper tabular-nums`}>
                    {rankText(result.rank)}
                  </td>
                  <th scope="row" className={`${CELL} sticky left-24 z-10 border-t border-line-soft bg-paper text-left`}>
                    <span data-product className="block font-semibold">
                      {session.product_label}
                    </span>
                    <span className="block text-xs font-normal text-muted">
                      {productSubline(session.measurement_kind, result.product_model_version, labelMode, language)}
                    </span>
                  </th>
                  <ScoreCell
                    score={result.det_score}
                    language={language}
                    href={href}
                    label={`skor deterministik ${session.product_label}`}
                  />
                  <ScoreCell
                    score={result.llm_score}
                    language={language}
                    href={href}
                    label={`skor penilai LLM ${session.product_label}`}
                  />
                  <td className={NUMBER}>{result.cases_graded_count}</td>
                  {full && <td className={NUMBER}>{result.cases_basis_count}</td>}
                  <td className={NUMBER}>{failureRateText(session.measurement_kind, result.failure_rate, language)}</td>
                  {full && <td className={NUMBER}>{result.repetitions}</td>}
                  <td className={CELL}>
                    <MarkerBadges row={row} language={language} />
                  </td>
                  {href && (
                    <td className={`${CELL} text-right`}>
                      <Link
                        href={href}
                        className="inline-flex h-8 items-center whitespace-nowrap rounded-control border border-line px-3 text-xs font-medium text-ink hover:bg-surface-hover"
                      >
                        Lihat kasus <span className="sr-only">{session.product_label}</span>
                        <span aria-hidden="true"> ›</span>
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
