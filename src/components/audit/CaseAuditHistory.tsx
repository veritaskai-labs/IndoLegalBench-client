"use client";

import { useState } from "react";
import { EmptyState, LoadingSkeleton } from "@/components/ui";
import { useAuditLog } from "@/hooks/useAuditLog";
import { AuditTable } from "./AuditTable";

type Props = {
  caseId: string;
};

export function CaseAuditHistory({ caseId }: Props) {
  const [today] = useState(() => new Date());
  const { state } = useAuditLog(today, { case_id: caseId });

  if (state.status === "loading") {
    return <LoadingSkeleton variant="lines" rows={3} />;
  }

  if (state.status === "error") {
    return null;
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
        <AuditTable entries={state.entries} onRowClick={() => undefined} />
      </div>
    </>
  );
}
