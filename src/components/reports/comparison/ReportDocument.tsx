import { reportInfoLine } from "@/lib/reports/reportCells";
import { REPORT_LABELS } from "@/lib/reports/reportLabels";
import { reportSections } from "@/lib/reports/reportSections";
import type { ReportDetail } from "@/types/reports";

import { ReportBarChart } from "./ReportBarChart";
import { ReportRankingTable } from "./ReportRankingTable";

/**
 * Isi laporan perbandingan, disusun seperti PDF (pdf.py render): logo dan judul, baris keterangan, banner
 * laporan dev, satu bagian per jenis nilai (tabel dan grafik), versi kasus, dan email kontak. Semuanya dalam
 * bahasa laporan (Fase 0 K3); atribut lang memberi tahu pembaca layar bahasanya. Judul diketik pengguna, jadi
 * tidak diterjemahkan. Logo resmi belum ada, jadi memakai tulisan VERITASK seperti PDF.
 */
export function ReportDocument({ report }: Readonly<{ report: ReportDetail }>) {
  const language = report.language;
  const labels = REPORT_LABELS[language];
  const sections = reportSections(report.sessions);

  return (
    <article lang={language} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <header className="space-y-1">
        <p className="text-sm font-bold tracking-[0.18em] text-slate-900">VERITASK</p>
        <h1 className="text-xl font-semibold text-slate-900">{report.title}</h1>
        <p className="text-sm text-slate-600">{reportInfoLine(report, language)}</p>
      </header>

      {report.has_dev_scores && (
        <p role="note" className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {labels.devBanner}
        </p>
      )}

      {sections.length === 0 ? (
        <p className="text-sm text-slate-600">{labels.noResults}</p>
      ) : (
        sections.map((section) => (
          <section key={section.split} className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">{labels.splits[section.split]}</h2>
            <ReportRankingTable rows={section.rows} language={language} caption={labels.splits[section.split]} />
            <ReportBarChart rows={section.rows} language={language} />
          </section>
        ))
      )}

      {report.case_basis.length > 0 && (
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-800">
            {labels.caseVersions} ({report.case_basis.length})
          </summary>
          <p className="mt-2 break-words">
            {report.case_basis.map((item) => `${item.case_code} v${item.case_version_no}`).join(", ")}
          </p>
        </details>
      )}

      <p className="text-sm italic text-slate-500">{labels.contact}</p>
    </article>
  );
}
