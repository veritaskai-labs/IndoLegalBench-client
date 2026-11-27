"use client";

import { useMemo, useState } from "react";

import { Badge, type Column, DataTable, EmptyState, Pager } from "@/components/ui";
import { sortNewestFirst, toVersionRow, type VersionRow, versionRangeText } from "@/lib/rubrics/rubricVersion";
import { paginate } from "@/lib/ui/tableModel";
import type { RubricVersionSummary } from "@/types/rubric";

/** Kartu ponsel per halaman (A3): lima kartu masih muat satu layar 390 px. */
const CARDS_PER_PAGE = 5;

const EMPTY_TITLE = "Belum ada versi rubrik";
const EMPTY_TEXT = "Sesi belum bisa dinilai sebelum ada versi aktif.";

function StatusBadge({ row }: Readonly<{ row: VersionRow }>) {
  return (
    <Badge tone={row.isActive ? "green" : "gray"} dot>
      {row.statusLabel}
    </Badge>
  );
}

/**
 * Kolom pertama mengisi tinggi sel, supaya garis hijau versi aktif (A1) menempel di tepi kiri baris
 * tanpa mengubah DataTable bersama.
 */
function VersionCell({ row }: Readonly<{ row: VersionRow }>) {
  return (
    <div
      data-active={row.isActive}
      className={`-mx-3 -my-2.5 flex h-[52px] items-center border-l-[3px] px-3 text-sm font-semibold text-ink ${row.isActive ? "border-success" : "border-transparent"}`}
    >
      {row.title}
    </div>
  );
}

const COLUMNS: readonly Column<VersionRow>[] = [
  { key: "title", header: "Versi", cell: (row) => <VersionCell row={row} /> },
  { key: "effectiveDate", header: "Berlaku sejak", cell: (row) => <span className="text-muted">{row.effectiveDate}</span> },
  { key: "createdBy", header: "Dibuat oleh", cell: (row) => row.createdBy },
  { key: "approverName", header: "Disetujui oleh", cell: (row) => row.approverName },
  { key: "approvedAt", header: "Tanggal persetujuan", cell: (row) => <span className="text-muted">{row.approvedAt}</span> },
  { key: "status", header: "Status", cell: (row) => <StatusBadge row={row} /> },
];

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

/** Kartu per versi untuk ponsel (A3, pola lapDetail ponsel 390): tabel enam kolom tidak muat. */
function VersionCards({ rows }: Readonly<{ rows: VersionRow[] }>) {
  const [page, setPage] = useState(1);
  const paged = paginate(rows, page, CARDS_PER_PAGE);
  const from = (paged.page - 1) * CARDS_PER_PAGE + 1;

  if (rows.length === 0) {
    return <EmptyState title={EMPTY_TITLE} description={EMPTY_TEXT} className="rounded-control border border-line bg-paper" />;
  }

  return (
    <div className="space-y-3">
      <ul aria-label="Versi rubrik" className="space-y-3">
        {paged.items.map((row) => (
          <li
            key={row.id}
            className={`rounded-control border border-line border-l-[3px] bg-paper p-4 ${row.isActive ? "border-l-success" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{row.title}</span>
              <StatusBadge row={row} />
            </div>
            <dl className="space-y-1">
              <Field label="Berlaku sejak" value={row.effectiveDate} />
              <Field label="Disetujui oleh" value={row.approver} />
              <Field label="Dibuat oleh" value={row.createdBy} />
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">{versionRangeText({ from, to: from + paged.items.length - 1, total: paged.total })}</p>
      {paged.lastPage > 1 && <Pager page={paged.page} lastPage={paged.lastPage} onPageChange={setPage} />}
    </div>
  );
}

/**
 * Daftar versi rubrik, read-only (PBI-14 AC7): versi tidak pernah diubah di tempat, perubahan adalah
 * versi baru. SCRUM-375: DataTable dengan footer jumlah versi (A1), penyetuju dan tanggalnya di kolom
 * sendiri (A2), dan kartu di ponsel (A3). Semua teks tampil datang dari toVersionRow.
 */
export function RubricVersionList({ versions }: Readonly<{ versions: RubricVersionSummary[] }>) {
  // Baris yang sama di tiap render: DataTable kembali ke halaman 1 bila identitas barisnya berubah.
  const rows = useMemo(() => sortNewestFirst(versions).map(toVersionRow), [versions]);

  return (
    <>
      <div className="hidden sm:block">
        <DataTable
          caption="Versi rubrik"
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => row.id}
          empty={<EmptyState title={EMPTY_TITLE} description={EMPTY_TEXT} />}
          summary={versionRangeText}
        />
      </div>
      <div className="sm:hidden">
        <VersionCards rows={rows} />
      </div>
    </>
  );
}
