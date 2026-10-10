import { formatWib } from "@/lib/datetime/formatWib";

/** Snapshot tidak punya nama; identitasnya adalah waktu pembuatan, misalnya "Snapshot 03 Okt 2026, 14.05 WIB". */
export function snapshotLabel(createdAt: string): string {
  return `Snapshot ${formatWib(createdAt)}`;
}
