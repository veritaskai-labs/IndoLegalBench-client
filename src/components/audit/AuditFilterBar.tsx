"use client";

import type { AuditActor } from "@/lib/audit/auditApi";
import { ENTITY_LABEL } from "@/lib/audit/entityLabels";
import type { AuditEntityType, AuditFilter } from "@/types/audit";

type Props = {
  value: AuditFilter;
  actors: AuditActor[];
  /** Batas dari aturan 90 hari (AC7). */
  minDate: string;
  maxDate: string;
  onChange: (next: AuditFilter) => void;
};

const FIELD =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 " +
  "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function AuditFilterBar({ value, actors, minDate, maxDate, onChange }: Props) {
  function patch(next: Partial<AuditFilter>) {
    onChange({ ...value, ...next });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="audit-from" className="text-xs font-medium text-slate-600">
          Dari tanggal
        </label>
        <input
          id="audit-from"
          type="date"
          className={FIELD}
          value={value.from}
          min={minDate}
          max={maxDate}
          onChange={(e) => patch({ from: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="audit-to" className="text-xs font-medium text-slate-600">
          Sampai tanggal
        </label>
        <input
          id="audit-to"
          type="date"
          className={FIELD}
          value={value.to}
          min={minDate}
          max={maxDate}
          onChange={(e) => patch({ to: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="audit-entity" className="text-xs font-medium text-slate-600">
          Jenis data
        </label>
        <select
          id="audit-entity"
          className={FIELD}
          value={value.entity_type ?? ""}
          onChange={(e) =>
            patch({ entity_type: (e.target.value || undefined) as AuditEntityType | undefined })
          }
        >
          <option value="">Semua jenis</option>
          {(Object.keys(ENTITY_LABEL) as AuditEntityType[]).map((type) => (
            <option key={type} value={type}>
              {ENTITY_LABEL[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="audit-actor" className="text-xs font-medium text-slate-600">
          Pelaku
        </label>
        <select
          id="audit-actor"
          className={FIELD}
          value={value.actor_id ?? ""}
          onChange={(e) => patch({ actor_id: e.target.value || undefined })}
        >
          <option value="">Semua pengguna</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.is_active ? actor.name : `${actor.name} (nonaktif)`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}