"use client";

import Link from "next/link";
import { useState } from "react";

import { ArchiveSessionDialog } from "@/components/runs/ArchiveSessionDialog";
import { SessionTable } from "@/components/runs/SessionTable";
import { EmptyState, ErrorState } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useSessions } from "@/hooks/useSessions";
import { canArchive } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

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
        <SessionTable
          sessions={rows}
          loading={sessions.status === "loading"}
          renderAction={(item) =>
            me && canArchive(item, me) ? (
              <button
                type="button"
                onClick={() => setTarget(item)}
                aria-label={`Arsipkan ${item.label}`}
                className="text-xs font-medium text-slate-900 hover:underline"
              >
                Arsipkan
              </button>
            ) : null
          }
        />
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
