import { formatWibDate } from "@/lib/datetime/formatWib";
import type { RubricVersionSummary } from "@/types/rubric";

/** Satu baris daftar versi rubrik (PBI-14 AC7), siap tampil tanpa logika di komponen. */
export interface VersionRow {
  id: string;
  title: string;
  effectiveDate: string;
  createdBy: string;
  /** Kolom "Disetujui oleh" (A2). */
  approverName: string;
  /** Kolom "Tanggal persetujuan" (A2); tanpa nama tidak ditampilkan. */
  approvedAt: string;
  /** Nama dan tanggal dalam satu baris, untuk kartu di ponsel (A3). */
  approver: string;
  statusLabel: string;
  isActive: boolean;
}

const EMPTY = "-";

/**
 * Penyetuju versi baru masih TBA dari klien, jadi kosong itu wajar. Tanggal tanpa nama tidak
 * menyebut siapa pun, jadi tidak ditampilkan sendirian.
 */
function approverParts(name: string | null, approvedAt: string | null): { name: string; date: string } {
  const trimmed = name?.trim();
  if (!trimmed) return { name: EMPTY, date: EMPTY };
  return { name: trimmed, date: approvedAt === null ? EMPTY : formatWibDate(approvedAt) };
}

export function toVersionRow(version: RubricVersionSummary): VersionRow {
  const approval = approverParts(version.approved_by_name, version.approved_at);
  return {
    id: version.id,
    title: `Versi ${version.version_no}`,
    effectiveDate: formatWibDate(version.effective_date),
    createdBy: version.created_by_name ?? EMPTY,
    approverName: approval.name,
    approvedAt: approval.date,
    approver: approval.date === EMPTY ? approval.name : `${approval.name} · ${approval.date}`,
    statusLabel: version.is_active ? "Aktif" : "Tidak aktif",
    isActive: version.is_active,
  };
}

/** Label versi seperti yang dikirim dan dibaca server, mis. "v2" (rubric_version di POST /grade). */
export function versionLabel(versionNo: number): string {
  return `v${versionNo}`;
}

/** Nomor tertinggi di atas. Salinan, supaya urutan array milik pemanggil tidak berubah. */
export function sortNewestFirst<T extends { version_no: number }>(versions: T[]): T[] {
  return [...versions].sort((a, b) => b.version_no - a.version_no);
}

/**
 * Versi terbaru untuk Nilai ulang (AC7): nomor tertinggi, bukan yang aktif dan bukan urutan dari
 * server. Null selama v1 belum dibuat, saat belum ada rubrik untuk menilai ulang.
 */
export function latestVersion<T extends { version_no: number }>(versions: T[]): T | null {
  return sortNewestFirst(versions)[0] ?? null;
}

/** Footer tabel versi (A1): baris yang tampil, jumlah semua versi, dan urutannya. */
export function versionRangeText({ from, to, total }: Readonly<{ from: number; to: number; total: number }>): string {
  return `Menampilkan ${from}–${to} dari ${total} versi · terbaru di atas`;
}

/**
 * Nomor yang akan didapat versi baru. Server memberi max(version_no) + 1 (grading/service.py),
 * jadi judul form memakai aturan yang sama; 1 bila belum ada versi.
 */
export function nextVersionNo(versions: readonly { version_no: number }[]): number {
  return versions.reduce((highest, version) => Math.max(highest, version.version_no), 0) + 1;
}
