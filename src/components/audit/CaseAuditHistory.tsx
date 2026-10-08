"use client";

import { useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { AuditEntry } from "@/types/audit";
import { AuditDetailPanel } from "./AuditDetailPanel";
import { AuditTable } from "./AuditTable";

type Props = {
  caseId: string;
};

export function CaseAuditHistory({ caseId }: Props) {
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const { state, reload } = useAuditLog(new Date(), { case_id: caseId });

  if (state.status === "loading") {
    return <LoadingSkeleton variant="lines" rows={3} />;
  }

  if (state.status === "error") {
    // 403 berarti kasus ini bukan tugasnya; mengulang tidak akan mengubah apa pun.
    const forbidden = state.status_code === 403;
    return (
      <ErrorState
        variant="card"
        message={
          forbidden
            ? "Anda tidak ditugaskan untuk mereview kasus ini."
            : "Gagal memuat riwayat kasus."
        }
        onRetry={forbidden ? undefined : reload}
      />
    );
  }

  if (state.entries.length === 0) {
    return (
      <EmptyState
        title="Belum ada riwayat"
        description="Belum ada perubahan tercatat untuk kasus ini."
      />
    );
  }

  return (
    <>
      <p className="mb-3 text-xs text-slate-500">
        Catatan disimpan 90 hari, lalu dihapus otomatis.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <AuditTable entries={state.entries} onRowClick={setSelected} />
      </div>
      {selected && <AuditDetailPanel entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}