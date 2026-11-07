"use client";

import { useState } from "react";

import { ArchiveSessionDialog } from "@/components/runs/ArchiveSessionDialog";
import { SessionTable } from "@/components/runs/SessionTable";
import { EmptyState, ErrorState } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useSessions } from "@/hooks/useSessions";
import { canArchive } from "@/lib/runs/sessionRules";
import type { Me } from "@/types";
import type { SessionListItem } from "@/types/measurement";

/**
 * Tab Sesi di halaman Eksekusi (PBI-11 AC10, SCRUM-212): sesi yang belum diarsipkan dan Arsipkan.
 * Panel dipasang baru tiap tab dibuka, jadi sesi yang baru dikembalikan dari tab Arsip sudah ada.
 */
export function ActiveSessionsPanel({ me }: Readonly<{ me: Pick<Me, "id" | "role"> | null }>) {
  const sessions = useSessions();
  const { showToast } = useToast();
  // Sesi yang baru diarsipkan disembunyikan tanpa memuat ulang daftar.
  const [archived, setArchived] = useState<ReadonlySet<string>>(new Set());
  const [target, setTarget] = useState<SessionListItem | null>(null);

  const rows = sessions.status === "ready" ? sessions.data.filter((item) => !archived.has(item.id)) : [];
  const isEmpty = sessions.status === "ready" && rows.length === 0;

  return (
    <div className="space-y-6">
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
