"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AuditDetailPanel } from "@/components/audit/AuditDetailPanel";
import { AuditPager } from "@/components/audit/AuditPager";
import { AuditTable } from "@/components/audit/AuditTable";
import { EmptyState, ErrorState, Icon, LoadingSkeleton } from "@/components/ui";
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
        <div className="overflow-x-auto rounded-control border border-line bg-paper">
          <AuditTable entries={state.entries} onRowClick={setSelected} />
        </div>

        <AuditPager page={page} lastPage={lastPage} onPageChange={setPage} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl leading-10 text-ink">Riwayat aktivitas</h1>
          <p className="mt-2 text-muted">
            Catatan disimpan 90 hari, lalu dihapus otomatis. Unduh bila perlu disimpan lebih lama.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={auditExportUrl(exportFilter, "csv")} className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-paper px-3.5 text-sm text-ink transition-colors hover:bg-surface">
            <Icon name="unduh" />
            Unduh CSV
          </a>
          <a href={auditExportUrl(exportFilter, "pdf")} className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-paper px-3.5 text-sm text-ink transition-colors hover:bg-surface">
            <Icon name="unduh" />
            Unduh PDF
          </a>
        </div>
      </header>

      <section className="rounded-control border border-line bg-paper p-4">
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