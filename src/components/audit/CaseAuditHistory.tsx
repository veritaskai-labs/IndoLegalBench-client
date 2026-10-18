"use client";

import { useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useAuditLog } from "@/hooks/useAuditLog";
import { describeCaseHistoryError } from "@/lib/audit/caseHistoryError";
import type { AuditEntry } from "@/types/audit";
import { AuditDetailPanel } from "./AuditDetailPanel";
import { AuditPager } from "./AuditPager";
import { AuditTable } from "./AuditTable";

type Props = {
  caseId: string;
};

export function CaseAuditHistory({ caseId }: Readonly<Props>) {
  const [today] = useState(() => new Date());
  const { state, page, setPage, reload } = useAuditLog(today, { case_id: caseId });
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  if (state.status === "loading") {
    return <LoadingSkeleton variant="lines" rows={3} />;
  }

  if (state.status === "error") {
    const { message, canRetry } = describeCaseHistoryError(state.status_code);
    return (
      <ErrorState variant="card" message={message} onRetry={canRetry ? reload : undefined} />
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

  const lastPage = Math.ceil(state.total / state.size);

  return (
    <>
      <p className="mb-3 text-xs text-slate-500">
        Catatan disimpan 90 hari, lalu dihapus otomatis.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <AuditTable entries={state.entries} onRowClick={setSelected} />
      </div>
      {lastPage > 1 && (
        <div className="mt-3">
          <AuditPager page={page} lastPage={lastPage} onPageChange={setPage} />
        </div>
      )}
      {selected && <AuditDetailPanel entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
