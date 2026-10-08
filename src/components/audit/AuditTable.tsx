"use client";

import { formatWib } from "@/lib/audit/formatWib";
import type { AuditEntry } from "@/types/audit";
import { entityLabel } from "@/lib/audit/entityLabels";

const ENTITY_LABEL: Record<string, string> = {
  case: "Kasus",
  case_version: "Versi kasus",
  review: "Review",
  suite: "Suite",
  ai_product: "Produk AI",
  user: "Pengguna",
};

type Props = {
  entries: AuditEntry[];
  onRowClick: (entry: AuditEntry) => void;
};

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
            <td className="py-3 px-4 text-slate-900">{item.actor_name ?? "Sistem"}</td>
            <td className="py-3 px-4 font-mono text-xs text-slate-700">{item.action}</td>
            <td className="py-3 px-4 text-slate-700">
              {ENTITY_LABEL[item.entity_type] ?? item.entity_type}{" "}
              <span className="font-mono text-xs text-slate-500">{item.entity_id}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}