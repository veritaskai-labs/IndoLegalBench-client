import { sessionStatusLabel } from "@/lib/runs/sessionRules";
import type { SessionStatus, StopReason } from "@/types/measurement";

const STATUS_BADGE: Record<SessionStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  running: "bg-indigo-50 text-indigo-800",
  finished: "bg-emerald-50 text-emerald-800",
  finished_with_failures: "bg-amber-50 text-amber-800",
  failed: "bg-red-50 text-red-800",
  // Warna sendiri: amber sudah dipakai Selesai dengan kegagalan, slate-100 sudah dipakai Menunggu.
  paused: "bg-sky-50 text-sky-800",
  cancelled: "bg-slate-200 text-slate-800",
  not_filled: "bg-slate-100 text-slate-700",
  partially_filled: "bg-amber-50 text-amber-800",
  complete: "bg-blue-50 text-blue-800",
  graded: "bg-purple-50 text-purple-800",
  finalized: "bg-emerald-50 text-emerald-800",
};

/**
 * Status sesi dengan warnanya, sama di daftar dan detail sesi. stopReason hanya dikirim detail
 * sesi; tanpanya sesi paused tetap terbaca "Dijeda".
 */
export function SessionStatusBadge({
  status,
  stopReason,
}: Readonly<{ status: SessionStatus; stopReason?: StopReason | null }>) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_BADGE[status]}`}>
      {sessionStatusLabel(status, stopReason)}
    </span>
  );
}
