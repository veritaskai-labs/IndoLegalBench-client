"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AuditDetailPanel } from "@/components/audit/AuditDetailPanel";
import { AuditPager } from "@/components/audit/AuditPager";
import { AuditTable } from "@/components/audit/AuditTable";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { auditExportUrl, listAuditActors, type AuditActor } from "@/lib/audit/auditApi";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { AuditEntry } from "@/types/audit";
import { AuditFilterBar } from "@/components/audit/AuditFilterBar";
import { clampDateRange } from "@/lib/audit/dateRange";



export default function AuditPage() {
  const { state, query, range, page, setFilter, setPage, reload } = useAuditLog(new Date());
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  
  const [actors, setActors] = useState<AuditActor[]>([]);

  useEffect(() => {
    let cancelled = false;
    listAuditActors()
      .then((rows) => !cancelled && setActors(rows))
      .catch(() => !cancelled && setActors([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const limit = clampDateRange(null, null, new Date());

  const exportFilter = {
    from: range.from,
    to: range.to,
    entity_type: query.entity_type,
    actor_id: query.actor_id,
    case_code: query.case_code,
  };

  const lastPage = state.status === "ready" ? Math.ceil(state.total / state.size) : 1;

  let results: ReactNode;
  if (state.status === "error") {
    results = <ErrorState variant="card" message="Gagal memuat catatan audit." onRetry={reload} />;
  } else if (state.status === "loading") {
    results = <LoadingSkeleton variant="lines" rows={5} />;
  } else if (state.entries.length === 0) {
    results = (
      <EmptyState
        title="Tidak ada catatan audit"
        description="Belum ada catatan yang cocok dengan filter ini."
      />
    );
  } else {
    results = (
      <>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <AuditTable entries={state.entries} onRowClick={setSelected} />
        </div>

        <AuditPager page={page} lastPage={lastPage} onPageChange={setPage} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Log audit</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catatan disimpan 90 hari, lalu dihapus otomatis. Unduh bila perlu disimpan lebih lama.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={auditExportUrl(exportFilter, "csv")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Unduh CSV
          </a>
          <a
            href={auditExportUrl(exportFilter, "pdf")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Unduh PDF
          </a>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <AuditFilterBar
        value={{ ...exportFilter, page }}
         actors={actors}
         minDate={limit.from}
         maxDate={limit.to}
         onChange={setFilter}
         />
      </section>

      {results}

      {selected && <AuditDetailPanel entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}