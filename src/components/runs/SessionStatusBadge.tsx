import { SESSION_STATUS_LABEL } from "@/lib/runs/sessionRules";
import type { SessionStatus } from "@/types/measurement";

const STATUS_BADGE: Record<SessionStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  running: "bg-indigo-50 text-indigo-800",
  finished: "bg-emerald-50 text-emerald-800",
  finished_with_failures: "bg-amber-50 text-amber-800",
  failed: "bg-red-50 text-red-800",
  paused: "bg-sky-50 text-sky-800",
  cancelled: "bg-slate-200 text-slate-800",
};

/** Status sesi dengan warnanya, sama di daftar dan detail sesi. */
export function SessionStatusBadge({ status }: Readonly<{ status: SessionStatus }>) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_BADGE[status]}`}>
      {SESSION_STATUS_LABEL[status]}
    </span>
  );
}
