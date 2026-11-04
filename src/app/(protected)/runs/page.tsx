"use client";

import Link from "next/link";
import { useState } from "react";

import { ArchiveSessionDialog } from "@/components/runs/ArchiveSessionDialog";
import { SessionStatusBadge } from "@/components/runs/SessionStatusBadge";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useSessions } from "@/hooks/useSessions";
import { formatWib } from "@/lib/datetime/formatWib";
import { canArchive, caseCountText, formatProgress, unknownName } from "@/lib/runs/sessionRules";
import type { Me } from "@/types";
import type { SessionListItem } from "@/types/measurement";

const COLUMNS = 9;

/** Halaman Eksekusi: daftar sesi pengukuran dan Arsipkan (PBI-11 AC10, SCRUM-212). */
export default function RunsPage() {
  const auth = useAuth();
  const me = auth.status === "authenticated" ? auth.user : null;
  const sessions = useSessions();
  const { showToast } = useToast();
  // Sesi yang baru diarsipkan disembunyikan tanpa memuat ulang daftar.
  const [archived, setArchived] = useState<ReadonlySet<string>>(new Set());
  const [target, setTarget] = useState<SessionListItem | null>(null);

  const rows = sessions.status === "ready" ? sessions.data.filter((item) => !archived.has(item.id)) : [];
  const isEmpty = sessions.status === "ready" && rows.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Eksekusi</h1>
          <p className="text-sm text-slate-500">
            Sesi pengukuran otomatis, terbaru di atas. Sesi yang diarsipkan disembunyikan, datanya tetap tersimpan.
          </p>
        </div>
        <Link
          href="/runs/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
        >
          Pengukuran Baru
        </Link>
      </header>

      {sessions.status === "error" && <ErrorState variant="card" message={sessions.message} onRetry={sessions.reload} />}

      {isEmpty && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <EmptyState
            title="Belum ada sesi pengukuran"
            description="Sesi yang dibuat dari halaman Buat pengukuran muncul di sini."
          />
        </div>
      )}

      {(sessions.status === "loading" || rows.length > 0) && (
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
              {sessions.status === "loading" && <LoadingSkeleton variant="table" rows={3} columns={COLUMNS} />}
              {rows.map((item) => (
                <SessionRow key={item.id} session={item} me={me} onArchive={() => setTarget(item)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {target && (
        <ArchiveSessionDialog
          session={target}
          onArchived={() => {
            setArchived((ids) => new Set(ids).add(target.id));
            showToast(`Sesi “${target.label}” diarsipkan`);
            setTarget(null);
          }}
          onClose={(afterError) => {
            setTarget(null);
            if (afterError) sessions.reload();
          }}
        />
      )}
    </div>
  );
}

function SessionRow({
  session,
  me,
  onArchive,
}: Readonly<{
  session: SessionListItem;
  me: Pick<Me, "id" | "role"> | null;
  onArchive: () => void;
}>) {
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
      <td className="px-4 py-3">
        {me && canArchive(session, me) && (
          <button
            type="button"
            onClick={onArchive}
            aria-label={`Arsipkan ${session.label}`}
            className="text-xs font-medium text-slate-900 hover:underline"
          >
            Arsipkan
          </button>
        )}
      </td>
    </tr>
  );
}
