"use client";

import Link from "next/link";

import { useResultCases } from "@/hooks/useReportDrilldown";
import { type DrilldownGateway, httpDrilldownGateway } from "@/lib/reports/drilldownApi";
import { canRetryDrilldown, caseNeighbours, resultCaseHref } from "@/lib/reports/drilldownRules";
import type { SortState } from "@/lib/ui/tableModel";
import type { ReportCaseScoreRead } from "@/types/reports";

// min-w-0 dan flex-wrap: di ponsel tiap tautan hanya selebar setengah layar, jadi label dan kode boleh turun baris
// (review #135: kode panjang membuat kedua tautan bertumpuk di 375 px).
const STEP =
  "inline-flex min-h-9 min-w-0 max-w-full flex-wrap items-center gap-x-1 rounded-control border border-line px-3 py-1.5 text-sm font-medium";

type Direction = "previous" | "next";

const STEP_LABEL: Readonly<Record<Direction, string>> = {
  previous: "Kasus sebelumnya",
  next: "Kasus berikutnya",
};

/**
 * Satu arah. Di kasus pertama atau terakhir tautannya tetap terlihat tetapi nonaktif, supaya tata letaknya tidak
 * bergeser dan pengguna tahu ia sudah di ujung daftar (SCRUM-378).
 */
function Step({
  direction,
  target,
  href,
}: Readonly<{ direction: Direction; target: ReportCaseScoreRead | null; href: (caseId: string) => string }>) {
  const arrowBefore = direction === "previous" ? <span aria-hidden="true">‹</span> : null;
  const arrowAfter = direction === "next" ? <span aria-hidden="true">›</span> : null;
  // Ponsel: dua kolom di bawah posisi. Layar lebar: sebelumnya, posisi, berikutnya dalam satu baris.
  const place = direction === "next" ? "justify-self-end sm:order-3" : "justify-self-start sm:order-1";
  if (target === null) {
    return (
      // role="link" supaya aria-disabled dibacakan ("link, dimmed"); span biasa dibaca sebagai teks (review #135).
      <span role="link" aria-disabled="true" className={`${STEP} ${place} cursor-not-allowed text-subtle`}>
        {arrowBefore}
        {STEP_LABEL[direction]}
        {arrowAfter}
      </span>
    );
  }
  return (
    <Link href={href(target.case_id)} className={`${STEP} ${place} bg-paper text-ink hover:bg-surface-hover`}>
      {/* Panah ikut labelnya; bila sempit, hanya kode yang turun baris. */}
      <span className="whitespace-nowrap">
        {arrowBefore} {STEP_LABEL[direction]} {arrowAfter}
      </span>
      {/* Spasi sungguhan, supaya nama tautan dibacakan "Kasus berikutnya ILB-004", bukan digabung. */}{" "}
      {/* Kode kasus boleh sampai 64 karakter tanpa spasi, jadi boleh dipotong di mana saja. */}
      <span className="min-w-0 font-normal text-muted [overflow-wrap:anywhere]">{target.case_code}</span>
    </Link>
  );
}

/**
 * "Kasus sebelumnya" dan "Kasus berikutnya" di detail kasus (SCRUM-378, alternatif A2 SCRUM-346 yang disetujui
 * PO), supaya pengguna tidak perlu kembali ke daftar kasus. Urutan dan produknya sama dengan daftar kasus asalnya
 * (angka yang sama, urutan dari alamat), dan hanya kasus yang bisa dibuka yang dilewati.
 *
 * Daftarnya dipakai ulang dari halaman daftar kasus bila ada; dibuka langsung (tautan atau muat ulang), daftarnya
 * diminta sekali bersamaan dengan detail. Selama dimuat atau bila kasus ini tidak bisa diurutkan, navigasi tidak
 * tampil; gagal sementara menawarkan Coba lagi tanpa mengganggu isi kasus.
 */
export function CaseNavigation({
  reportId,
  resultId,
  caseId,
  sort,
  gateway = httpDrilldownGateway,
}: Readonly<{
  reportId: string;
  resultId: string;
  caseId: string;
  sort: SortState | null;
  gateway?: DrilldownGateway;
}>) {
  const cases = useResultCases(reportId, resultId, gateway);
  if (cases.status === "loading") return null;
  if (cases.status === "error") {
    if (!canRetryDrilldown(cases.message)) return null;
    return (
      <p className="text-sm text-muted">
        Kasus sebelumnya dan berikutnya gagal dimuat.{" "}
        <button type="button" onClick={cases.reload} className="font-medium text-accent-ink hover:underline">
          Coba lagi
        </button>
      </p>
    );
  }
  const found = caseNeighbours(cases.data.cases, caseId, sort);
  if (found === null || found.total < 2) return null;
  const href = (target: string) => resultCaseHref(reportId, resultId, target, sort);

  return (
    <nav aria-label="Kasus lain di angka ini" className="grid grid-cols-2 items-start gap-2 sm:flex sm:items-center sm:justify-between">
      <p className="col-span-2 text-center text-sm text-muted sm:order-2 sm:col-span-1">
        Kasus {found.position} dari {found.total}
      </p>
      <Step direction="previous" target={found.previous} href={href} />
      <Step direction="next" target={found.next} href={href} />
    </nav>
  );
}
