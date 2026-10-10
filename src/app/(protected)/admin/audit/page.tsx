"use client";

import { useState, useEffect } from "react";
import { AuditDetailPanel } from "@/components/audit/AuditDetailPanel";
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
    page,
  };

  const lastPage = state.status === "ready" ? Math.ceil(state.total / state.size) : 1;

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
          value={{
            from: range.from,
            to: range.to,
            entity_type: query.entity_type,
            actor_id: query.actor_id,
            page,
          }}
          actors={actors}
          minDate={limit.from}
          maxDate={limit.to}
          onChange={setFilter}
        />
      </section>

      {state.status === "error" ? (
        <ErrorState variant="card" message="Gagal memuat catatan audit." onRetry={reload} />
      ) : state.status === "loading" ? (
        <LoadingSkeleton variant="lines" rows={5} />
      ) : state.entries.length === 0 ? (
        <EmptyState
          title="Tidak ada catatan audit"
          description="Belum ada catatan yang cocok dengan filter ini."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <AuditTable entries={state.entries} onRowClick={setSelected} />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman {page} dari {lastPage}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= lastPage}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </>
      )}

      {selected && <AuditDetailPanel entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}