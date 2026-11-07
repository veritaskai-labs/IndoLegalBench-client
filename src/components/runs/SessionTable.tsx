import Link from "next/link";
import type { ReactNode } from "react";

import { SessionStatusBadge } from "@/components/runs/SessionStatusBadge";
import { LoadingSkeleton } from "@/components/ui";
import { formatWib } from "@/lib/datetime/formatWib";
import { caseCountText, formatProgress, unknownName } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

const COLUMNS = 9;

/**
 * Tabel sesi pengukuran (PBI-11 AC10), dipakai daftar utama dan daftar arsip dengan kolom yang sama.
 * Kolom Aksi diisi pemanggil lewat renderAction: Arsipkan di daftar utama, Kembalikan di arsip.
 */
export function SessionTable({
  sessions,
  loading,
  renderAction,
}: Readonly<{
  sessions: readonly SessionListItem[];
  loading: boolean;
  renderAction: (session: SessionListItem) => ReactNode;
}>) {
  return (
    // relative: keeps sr-only labels inside the scroll box on a phone (SCRUM-204 F2).
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3">Label</th>
            <th scope="col" className="px-4 py-3">Dibuat</th>
            <th scope="col" className="px-4 py-3">Pembuat</th>
            <th scope="col" className="px-4 py-3">Produk</th>
            <th scope="col" className="px-4 py-3">Kasus</th>
            <th scope="col" className="px-4 py-3">Pengulangan</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Progres</th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <LoadingSkeleton variant="table" rows={3} columns={COLUMNS} />}
          {sessions.map((item) => (
            <SessionRow key={item.id} session={item} action={renderAction(item)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionRow({ session, action }: Readonly<{ session: SessionListItem; action: ReactNode }>) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-medium text-slate-900">
        <Link href={`/runs/${encodeURIComponent(session.id)}`} className="hover:underline">
          {session.label}
        </Link>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatWib(session.created_at)}</td>
      <td className="px-4 py-3 text-slate-600">{unknownName(session.created_by_name)}</td>
      <td className="px-4 py-3 text-slate-600">{unknownName(session.product_name)}</td>
      <td className="px-4 py-3 text-slate-600">{caseCountText(session.case_count)}</td>
      <td className="px-4 py-3 text-slate-600">{session.repetitions}</td>
      <td className="px-4 py-3">
        <SessionStatusBadge status={session.status} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatProgress(session)}</td>
      <td className="px-4 py-3">{action}</td>
    </tr>
  );
}
