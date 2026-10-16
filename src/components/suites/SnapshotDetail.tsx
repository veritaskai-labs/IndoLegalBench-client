"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useSnapshotDetail } from "@/hooks/useSnapshotDetail";
import { snapshotLabel } from "@/lib/suites/snapshotLabel";
import { toSnapshotCaseView } from "@/lib/suites/snapshotBody";

/** Isi satu snapshot, hanya baca. Ini salinan saat dibekukan; mengedit kasus tidak mengubahnya. */
export function SnapshotDetail({ snapshotId, onClose }: { snapshotId: string; onClose: () => void }) {
  const detail = useSnapshotDetail(snapshotId);

  if (detail.status === "loading") return <LoadingState label="Memuat isi snapshot…" />;

  if (detail.status === "error") {
    return <ErrorState variant="card" message={detail.message} onRetry={detail.reload} />;
  }

  const { snapshot } = detail;
  const cases = snapshot.items.map(toSnapshotCaseView);

  return (
    <section
      aria-label={`Isi ${snapshotLabel(snapshot.created_at)}`}
      className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{snapshotLabel(snapshot.created_at)}</h3>
          <p className="text-xs text-slate-500">
            Oleh {snapshot.author.name} · {cases.length} kasus
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Tutup
        </button>
      </div>

      {cases.length === 0 ? (
        <EmptyState title="Snapshot ini tidak berisi kasus" description="Tidak ada kasus yang dibekukan." />
      ) : (
        <div className="space-y-2">
          {cases.map((view) => (
            <details key={view.caseId} className="rounded border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm text-slate-900">
                <span className="font-mono font-medium">{view.caseCode}</span> {view.title}
                {view.versionNo !== null && (
                  <span className="ml-2 text-xs text-slate-500">Versi {view.versionNo}</span>
                )}
              </summary>
              <dl className="space-y-3 border-t border-slate-100 px-4 py-3 text-xs">
                {view.sections.map((section) => (
                  <div key={section.key}>
                    <dt className="font-medium text-slate-700">{section.label}</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {section.lines.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        section.lines.map((line, index) => (
                          <p key={index} className="whitespace-pre-wrap">
                            {line}
                          </p>
                        ))
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
