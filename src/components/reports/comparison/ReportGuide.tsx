import { REPORT_GUIDE } from "@/lib/reports/reportGuide";

/**
 * Panel "Cara membaca laporan ini" (SCRUM-346 A5, temuan N5; PO memutuskan panel ini tetap ada, 25 Nov), pola
 * tautan metodologi Artificial Analysis. Dilipat secara bawaan. Penjelasannya sama dengan ikon info di header
 * tabel, ditambah aturan skor dev dan test yang tidak punya kolom sendiri.
 */
export function ReportGuide() {
  return (
    <details className="text-sm text-ink-soft">
      <summary className="cursor-pointer font-medium text-accent-ink">Cara membaca laporan ini</summary>
      <dl className="mt-3 grid gap-x-6 gap-y-3 rounded-control border border-line bg-surface p-4 sm:grid-cols-2">
        {REPORT_GUIDE.map((entry) => (
          <div key={entry.term} className="space-y-0.5">
            <dt className="font-semibold text-ink">{entry.term}</dt>
            <dd>{entry.text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
