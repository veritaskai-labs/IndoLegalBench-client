"use client";

import { useState } from "react";

import { ArchiveSessionDialog } from "@/components/runs/ArchiveSessionDialog";
import { SessionTable } from "@/components/runs/SessionTable";
import { EmptyState, ErrorState } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useSessions } from "@/hooks/useSessions";
import { useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { canArchive } from "@/lib/runs/sessionRules";
import type { Me } from "@/types";
import type { SessionListItem } from "@/types/measurement";

const COPY = messages({
  id: {
    emptyTitle: "Belum ada sesi pengukuran",
    emptyDescription: "Sesi yang dibuat dari halaman Buat pengukuran muncul di sini.",
    archive: "Arsipkan",
    archiveLabel: "Arsipkan {label}",
    archived: "Sesi “{label}” diarsipkan",
  },
  en: {
    emptyTitle: "No measurement sessions yet",
    emptyDescription: "Sessions created from the New measurement page appear here.",
    archive: "Archive",
    archiveLabel: "Archive {label}",
    archived: "Session “{label}” archived",
  },
});

/**
 * Tab Sesi di halaman Eksekusi (PBI-11 AC10, SCRUM-212): sesi yang belum diarsipkan dan Arsipkan.
 * Panel dipasang baru tiap tab dibuka, jadi sesi yang baru dikembalikan dari tab Arsip sudah ada.
 */
export function ActiveSessionsPanel({ me }: Readonly<{ me: Pick<Me, "id" | "role"> | null }>) {
  const copy = useText(COPY);
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
            title={copy.emptyTitle}
            description={copy.emptyDescription}
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
                aria-label={fill(copy.archiveLabel, { label: item.label })}
                className="text-xs font-medium text-slate-900 hover:underline"
              >
                {copy.archive}
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
            showToast(fill(copy.archived, { label: target.label }));
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
