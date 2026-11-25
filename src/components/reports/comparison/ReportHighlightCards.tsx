import { Badge } from "@/components/ui/Badge";
import { reportHighlights } from "@/lib/reports/reportHighlights";
import type { ReportRow } from "@/lib/reports/reportSections";

/**
 * Kartu sorotan di atas tabel peringkat (SCRUM-346 A6, disetujui PO 25 Nov, pola kartu kesimpulan Artificial
 * Analysis): satu kartu per angka, menyebut produk terbaiknya. Aturannya di reportHighlights; tabel tetap acuan
 * peringkat. Tidak tampil sama sekali bila tidak ada angka.
 */
export function ReportHighlightCards({ rows, label }: Readonly<{ rows: readonly ReportRow[]; label: string }>) {
  const cards = reportHighlights(rows);
  if (cards.length === 0) return null;

  return (
    <ul aria-label={label} className="grid list-none gap-3 p-0 md:grid-cols-3">
      {cards.map((card) => (
        <li key={card.metric} className="space-y-2 rounded-control border border-line bg-paper p-4">
          <h3 className="inline-flex rounded-tag bg-surface px-2 py-0.5 text-xs font-medium text-ink-soft">{card.title}</h3>
          <p className="text-sm text-ink">{card.sentence}</p>
          <ul aria-label="Produk teratas" className="flex list-none flex-wrap gap-1 p-0">
            {card.leaders.map((leader) => (
              <li key={leader}>
                <Badge tone="blue">{leader}</Badge>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
