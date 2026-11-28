"use client";

import { useState } from "react";

import { SessionTable } from "@/components/runs/SessionTable";
import { UnarchiveSessionDialog } from "@/components/runs/UnarchiveSessionDialog";
import { EmptyState, ErrorState } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useSessions } from "@/hooks/useSessions";
import { useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { canUnarchive } from "@/lib/runs/sessionRules";
import type { Me } from "@/types";
import type { SessionListItem } from "@/types/measurement";

const COPY = messages({
  id: {
    emptyTitle: "Belum ada sesi terarsip",
    emptyDescription: "Sesi yang diarsipkan dari tab Sesi muncul di sini dan bisa dikembalikan.",
    restore: "Kembalikan",
    restoreLabel: "Kembalikan {label}",
    restored: "Sesi “{label}” dikembalikan",
  },
  en: {
    emptyTitle: "No archived sessions yet",
    emptyDescription: "Sessions archived from the Sessions tab appear here and can be restored.",
    restore: "Restore",
    restoreLabel: "Restore {label}",
    restored: "Session “{label}” restored",
  },
});

/**
 * Tab Arsip di halaman Eksekusi (PBI-11 AC10): sesi terarsip dengan kolom yang sama, dan Kembalikan
 * per sesi. Panel ini dipasang baru tiap tab dibuka, jadi sesi yang baru diarsipkan langsung ada,
 * dan daftar utama dimuat ulang sendiri saat tab Sesi dibuka lagi, tanpa memuat ulang halaman.
 */
export function ArchivedSessionsPanel({ me }: Readonly<{ me: Pick<Me, "id" | "role"> | null }>) {
  const copy = useText(COPY);
  const sessions = useSessions(true);
  const { showToast } = useToast();
  // Sesi yang baru dikembalikan disembunyikan tanpa memuat ulang daftar arsip.
  const [restored, setRestored] = useState<ReadonlySet<string>>(new Set());
  const [target, setTarget] = useState<SessionListItem | null>(null);

  const rows = sessions.status === "ready" ? sessions.data.filter((item) => !restored.has(item.id)) : [];
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
            me && canUnarchive(item, me) ? (
              <button
                type="button"
                onClick={() => setTarget(item)}
                aria-label={fill(copy.restoreLabel, { label: item.label })}
                className="text-xs font-medium text-slate-900 hover:underline"
              >
                {copy.restore}
              </button>
            ) : null
          }
        />
      )}

      {target && (
        <UnarchiveSessionDialog
          session={target}
          onUnarchived={() => {
            setRestored((ids) => new Set(ids).add(target.id));
            showToast(fill(copy.restored, { label: target.label }));
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
