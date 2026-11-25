"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatWib } from "@/lib/datetime/formatWib";
import { judgeLabel, reportRunHref, reportRunStatusLabel } from "@/lib/grading/gradingRules";
import { formatRupiah } from "@/lib/providers/format";
import type { GradedRunListItem } from "@/types/grading";

const HEADERS = ["Sesi", "Produk", "LLM judge", "Versi rubrik", "Dinilai", "Status", "Biaya pengukuran", "Biaya penilaian", "Total"];
const COST_HEADERS = new Set(["Biaya pengukuran", "Biaya penilaian", "Total"]);
const NO_VALUE = "–";
const COST_CELL = "px-4 py-2 whitespace-nowrap text-right tabular-nums text-slate-700";
const SESSION_HEADER = "px-4 py-2 md:sticky md:left-0 md:z-20 md:bg-slate-50 md:whitespace-nowrap";
const SESSION_CELL = "px-4 py-2 md:sticky md:left-0 md:z-10 md:bg-white md:whitespace-nowrap";
const SESSION_SHADOW = "md:shadow-[8px_0_8px_-8px_rgba(15,23,42,0.35)]";

/** Biaya tersimpan. Null adalah tanda kosong, bukan Rp 0. */
function formatCost(value: string | null): string {
  return value === null ? NO_VALUE : formatRupiah(value);
}

function headerClass(header: string, sessionEdge: string): string {
  if (header === "Sesi") return `${SESSION_HEADER} ${sessionEdge}`.trim();
  if (COST_HEADERS.has(header)) return "px-4 py-2 text-right whitespace-nowrap";
  return "px-4 py-2";
}

/**
 * Daftar hasil penilaian di Laporan, satu baris per grading run (PBI-14 AC8, PBI-22 AC9, K-21):
 * nilai ulang menambah baris dan baris lama tetap ada, jadi judge dan versi rubrik bisa dibedakan.
 * Biaya pengukuran, biaya penilaian, dan total datang dari GET /results/sessions (SCRUM-299) dan
 * memakai formatRupiah. Null memakai tanda kosong yang sama dengan judge yang tidak ada. 0.00
 * tetap Rupiah, termasuk biaya pengukuran sesi manual. Di laptop nama sesi tetap di tempat saat
 * jumlah yang panjang digeser ke dalam layar, dan bayangan tepi muncul setelah tabel digeser.
 * Di HP seluruh tabel bergeser ke samping. Data dan muat ulang datang dari useGradedSessions,
 * aturan label dan link di gradingRules, dan server yang menyaring sesi serta peran. Komponen ini
 * hanya menyimpan apakah tabel sedang digeser. Label sesi membuka run itu, bukan selalu run terbaru.
 */
export function GradedSessionList({
  sessions,
}: Readonly<{ sessions: AsyncResource<GradedRunListItem[]> & { reload: () => void } }>) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!scroller) return;
    const mark = () => setScrolled(scroller.scrollLeft > 0);
    mark();
    scroller.addEventListener("scroll", mark, { passive: true });
    return () => scroller.removeEventListener("scroll", mark);
  }, [scroller]);

  if (sessions.status === "loading") return <LoadingState />;
  if (sessions.status === "error") return <ErrorState variant="card" message={sessions.message} onRetry={sessions.reload} />;

  const sessionEdge = scrolled ? SESSION_SHADOW : "";

  return (
    <div ref={setScroller} className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Hasil penilaian per run</caption>
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header}
                scope="col"
                className={headerClass(header, sessionEdge)}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sessions.data.length === 0 && (
            <EmptyState
              inTable
              colSpan={HEADERS.length}
              title="Belum ada sesi yang dinilai."
              description="Sesi tampil di sini setelah selesai dan dinilai Admin."
            />
          )}
          {sessions.data.map((item) => (
            <tr key={item.grading_run_id}>
              <td className={`${SESSION_CELL} ${sessionEdge}`.trim()}>
                <Link href={reportRunHref(item)} className="font-medium text-indigo-700 hover:underline">
                  {item.label}
                </Link>
              </td>
              <td className="px-4 py-2 text-slate-700">{item.product_name}</td>
              <td className="px-4 py-2 text-slate-700">{judgeLabel(item.judge) ?? NO_VALUE}</td>
              <td className="px-4 py-2 text-slate-700">{item.rubric_version}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-700">{formatWib(item.graded_at)}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-700">{reportRunStatusLabel(item)}</td>
              <td className={COST_CELL}>{formatCost(item.measurement_cost_idr)}</td>
              <td className={COST_CELL}>{formatCost(item.judge_cost_idr)}</td>
              <td className={COST_CELL}>{formatCost(item.total_cost_idr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
