import { useId, type ReactNode } from "react";

import { InfoTip } from "@/components/dashboard/InfoTip";
import { Icon } from "@/components/ui/Icon";
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import type { CaseStatus } from "@/types/case";
import type { CaseCounts } from "@/types/dashboard";

/** Urutan hidup sebuah kasus, bukan abjad. */
const ORDER: readonly CaseStatus[] = [
  "draft",
  "in_review",
  "needs_revision",
  "approved",
];

/** Warna status dari prototipe, dipakai bersama oleh diagram, penanda, dan bilah. */
const COLOR: Record<CaseStatus, string> = {
  draft: "#949494",
  in_review: "#ffd600",
  needs_revision: "#ff6a1f",
  approved: "#34a853",
};

// Percent of the ring left blank between two statuses, as in the design.
const GAP = 0.6;

/** Cuts a filled disc down to a ring `thickness` px wide, so the ring shows on any background. */
const ring = (thickness: number) =>
  `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness - 1}px))`;

/**
 * AC1: jumlah kasus per status dan jumlah yang menunggu review, dalam satu kartu dengan diagram donat
 * (SCRUM-347). Dipakai juga untuk kasus milik Kontributor (PBI-24 AC6): beri `title` sendiri dan jangan
 * isi `waiting`, karena petak "Menunggu review" milik seluruh tim. `children` tampil di samping petak itu
 * (petak penugasan ulang milik Admin). Id dibuat per instance supaya dua kartu di satu halaman tidak
 * berbagi label.
 */
export function CaseCountCards({
  counts,
  total,
  waiting,
  title = "Ringkasan kasus",
  emptyNote,
  children,
}: Readonly<{
  counts: CaseCounts;
  total: number;
  waiting?: number;
  title?: string;
  emptyNote?: string;
  children?: ReactNode;
}>) {
  const headingId = useId();
  const helpId = `${headingId}-menunggu-review`;
  const share = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));

  return (
    <section aria-labelledby={headingId} className="rounded-control border border-line bg-paper p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="font-serif text-[22px] font-medium leading-7 text-ink">
          {title}
        </h2>
        <p className="text-sm font-semibold text-ink">Total {total} kasus</p>
      </div>
      {total === 0 && emptyNote && <p className="mt-1 text-sm text-muted">{emptyNote}</p>}

      <div className="mt-6 grid items-center gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <Donut counts={counts} total={total} />

        <div className="space-y-3">
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {ORDER.map((status) => (
              <li key={status} className="rounded-control border border-line p-4">
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <span aria-hidden="true" className="size-2.5 rounded-xs" style={{ background: COLOR[status] }} />
                  {CASE_STATUS_LABEL[status]}
                </p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-serif text-4xl leading-10 text-ink tabular-nums">{counts[status]}</span>
                  <span className="text-xs text-muted">{share(counts[status])}%</span>
                </p>
                <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full" style={{ width: `${share(counts[status])}%`, background: COLOR[status] }} />
                </div>
              </li>
            ))}
          </ul>

          {(waiting !== undefined || children) && (
            <div className="grid gap-3 md:grid-cols-2">
              {waiting !== undefined && (
                <ul>
                  <li aria-describedby={helpId} className="flex h-full items-center gap-4 rounded-control bg-accent-wash p-4">
                    <div
                      aria-hidden="true"
                      className="size-10 shrink-0 rounded-full"
                      style={{
                        background: `conic-gradient(var(--accent) ${share(waiting)}%, color-mix(in srgb, var(--accent) 22%, transparent) 0)`,
                        mask: ring(4),
                      }}
                    />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm text-ink">
                        Menunggu review*
                        <InfoTip tone="accent" text="Termasuk kasus disetujui yang versi barunya sedang ditinjau." />
                      </p>
                      <p className="mt-1 flex items-baseline gap-2">
                        <span className="font-serif text-3xl leading-8 text-ink tabular-nums">{waiting}</span>
                        <span className="text-xs text-muted">dari {total} kasus</span>
                      </p>
                    </div>
                  </li>
                </ul>
              )}
              {children}
            </div>
          )}
        </div>
      </div>

      {waiting !== undefined && (
        <p id={helpId} className="mt-4 flex gap-2 text-xs text-muted">
          <Icon name="info" size={14} className="mt-px" />
          <span>
            * Menunggu review bisa lebih besar dari &quot;Dalam tinjauan&quot;: kasus yang sudah disetujui tapi versi
            barunya sedang ditinjau tetap terhitung Disetujui, tapi ikut dihitung di sini.
          </span>
        </p>
      )}
    </section>
  );
}

/** Sebaran status sebagai donat, searah jarum jam dari atas. Angkanya sudah tertulis di petak, jadi disembunyikan dari pembaca layar. */
function Donut({ counts, total }: Readonly<{ counts: CaseCounts; total: number }>) {
  const shown = ORDER.filter((status) => counts[status] > 0);
  const upTo = (index: number) => shown.slice(0, index).reduce((sum, status) => sum + (counts[status] / total) * 100, 0);
  const stops = shown.flatMap((status, index) => {
    const from = upTo(index);
    const to = upTo(index + 1);
    const end = shown.length > 1 ? to - GAP : to;
    return end < to ? [`${COLOR[status]} ${from}% ${end}%`, `transparent ${end}% ${to}%`] : [`${COLOR[status]} ${from}% ${to}%`];
  });

  return (
    <div aria-hidden="true" className="relative mx-auto grid size-52 place-items-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "var(--line-soft)",
          mask: ring(24),
        }}
      />
      <div className="text-center">
        <p className="font-serif text-5xl leading-none text-ink">{total}</p>
        <p className="mt-1 text-sm text-muted">total kasus</p>
      </div>
    </div>
  );
}
