"use client";

import { formatWib } from "@/lib/audit/formatWib";
import type { AuditEntry } from "@/types/audit";

type Props = {
  entry: AuditEntry;
  onClose: () => void;
};

function ValueBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
        {value === null ? "Tidak ada" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/** Detail satu catatan audit. Hanya menerima satu catatan, tidak tahu daftarnya. */
export function AuditDetailPanel({ entry, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detail catatan audit"
      className="rounded-lg border border-slate-200 bg-white p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{entry.action}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {formatWib(entry.occurred_at)} · {entry.actor_user_id} · {entry.entity_id}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Tutup
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ValueBlock label="Sebelum" value={entry.before} />
        <ValueBlock label="Sesudah" value={entry.after} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-slate-700">Alasan</p>
        <p className="mt-1 text-sm text-slate-600">{entry.reason ?? "Tanpa alasan"}</p>
      </div>
    </div>
  );
}