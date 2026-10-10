import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { SnapshotsState } from "@/hooks/useSnapshots";
import { snapshotLabel } from "@/lib/suites/snapshotLabel";

type Props = {
  state: SnapshotsState;
  page: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
};

/** Daftar snapshot per timestamp. Hanya menampilkan; datanya datang dari useSnapshots. */
export function SnapshotList({ state, page, onPageChange, onRetry }: Props) {
  if (state.status === "loading") return <LoadingState label="Memuat snapshot…" />;

  if (state.status === "error") {
    return <ErrorState variant="card" message={state.message} onRetry={onRetry} />;
  }

  const { items, total, size } = state.page;

  if (total === 0) {
    return (
      <EmptyState
        title="Belum ada snapshot"
        description="Snapshot muncul setelah Admin membekukan kasus yang sudah disetujui."
      />
    );
  }

  const lastPage = Math.max(1, Math.ceil(total / size));

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
        {items.map((snapshot) => {
          const label = snapshotLabel(snapshot.created_at);
          return (
            <li key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">
                  Oleh {snapshot.author.name} · {snapshot.case_count} kasus
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {total > size && (
        <nav aria-label="Halaman snapshot" className="flex items-center justify-between text-xs text-slate-600">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {lastPage}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= lastPage}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Berikutnya
          </button>
        </nav>
      )}
    </div>
  );
}
