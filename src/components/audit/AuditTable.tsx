"use client";

import { actorIdentity } from "@/lib/audit/actorLabel";
import { auditActionSentence, auditObjectNoun } from "@/lib/audit/auditSentence";
import { formatWib } from "@/lib/audit/formatWib";
import type { AuditEntry } from "@/types/audit";

type Props = {
  entries: AuditEntry[];
  onRowClick: (entry: AuditEntry) => void;
};

function ActorCell({ entry }: Readonly<{ entry: AuditEntry }>) {
  const { primary, secondary } = actorIdentity(entry);
  return (
    <>
      <span className="break-all">{primary}</span>
      {secondary && <span className="block text-xs text-slate-500">{secondary}</span>}
    </>
  );
}

export function AuditTable({ entries, onRowClick }: Props) {
  return (
        <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-xs font-medium text-slate-600">
        <tr>
          <th className="py-3 px-4">Waktu</th>
          <th className="py-3 px-4">Pelaku</th>
          <th className="py-3 px-4">Aksi</th>
          <th className="py-3 px-4">Objek</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((item) => (
          <tr
            key={item.id}
            onClick={() => onRowClick(item)}
            className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
          >
            <td className="py-3 px-4 text-slate-600">{formatWib(item.occurred_at)}</td>
            <td className="py-3 px-4 text-slate-900">
              <ActorCell entry={item} />
            </td>
            <td className="py-3 px-4 text-slate-700">{auditActionSentence(item)}</td>
            <td className="py-3 px-4 text-slate-700">
              {auditObjectNoun(item.entity_type)}{" "}
              {item.entity_label ?? (
                <span className="font-mono text-xs text-slate-500">{item.entity_id}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}