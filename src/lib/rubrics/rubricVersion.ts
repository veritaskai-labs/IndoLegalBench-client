import { formatWibDate } from "@/lib/datetime/formatWib";
import type { RubricVersion } from "@/types/rubric";

/** Satu baris daftar versi rubrik (PBI-14 AC7), siap tampil tanpa logika di komponen. */
export interface VersionRow {
  id: string;
  title: string;
  effectiveDate: string;
  createdBy: string;
  approver: string;
  statusLabel: string;
  isActive: boolean;
}

const EMPTY = "-";

/**
 * Penyetuju versi baru masih TBA dari klien, jadi kosong itu wajar. Tanggal tanpa nama tidak
 * menyebut siapa pun, jadi tidak ditampilkan sendirian.
 */
function approverText(name: string | null, approvedAt: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return EMPTY;
  return approvedAt === null ? trimmed : `${trimmed}, ${formatWibDate(approvedAt)}`;
}

export function toVersionRow(version: RubricVersion): VersionRow {
  return {
    id: version.id,
    title: `Versi ${version.version_no}`,
    effectiveDate: formatWibDate(version.effective_date),
    createdBy: version.created_by_name ?? EMPTY,
    approver: approverText(version.approved_by_name, version.approved_at),
    statusLabel: version.is_active ? "Aktif" : "Tidak aktif",
    isActive: version.is_active,
  };
}

/** Nomor tertinggi di atas. Salinan, supaya urutan array milik pemanggil tidak berubah. */
export function sortNewestFirst(versions: RubricVersion[]): RubricVersion[] {
  return [...versions].sort((a, b) => b.version_no - a.version_no);
}

/**
 * Versi terbaru untuk Nilai ulang (AC7): nomor tertinggi, bukan yang aktif dan bukan urutan dari
 * server. Null selama v1 belum dibuat, saat belum ada rubrik untuk menilai ulang.
 */
export function latestVersion(versions: RubricVersion[]): RubricVersion | null {
  return sortNewestFirst(versions)[0] ?? null;
}
