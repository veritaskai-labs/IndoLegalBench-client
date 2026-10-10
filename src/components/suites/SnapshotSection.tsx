"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSnapshots } from "@/hooks/useSnapshots";
import { canCreateSnapshot } from "@/lib/suites/permissions";
import { CreateSnapshotDialog } from "./CreateSnapshotDialog";
import { SnapshotDetail } from "./SnapshotDetail";
import { SnapshotList } from "./SnapshotList";

/** Bagian snapshot di halaman suite. Semua peran bisa melihat; tombol buat snapshot hanya untuk Admin. */
export function SnapshotSection({ suiteId }: { suiteId: string }) {
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const snapshots = useSnapshots(suiteId, page);

  return (
    <section aria-label="Snapshot" className="space-y-3 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Snapshot</h2>
          <p className="text-xs text-slate-500">
            Kasus yang sudah disetujui, dibekukan pada satu waktu sebagai penanda rilis.
          </p>
        </div>
        {canCreateSnapshot(role) && (
          <button
            type="button"
            onClick={() => {
              setCreated(false);
              setDialogOpen(true);
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Buat snapshot
          </button>
        )}
      </div>

      {created && (
        <p role="status" className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Snapshot berhasil dibuat.
        </p>
      )}

      <SnapshotList
        state={snapshots}
        page={page}
        onPageChange={setPage}
        onRetry={snapshots.reload}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
      />

      {selectedId !== null && (
        <SnapshotDetail key={selectedId} snapshotId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {dialogOpen && (
        <CreateSnapshotDialog
          suiteId={suiteId}
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false);
            setCreated(true);
            // Snapshot baru ada di halaman pertama (terbaru dulu).
            setPage(1);
            snapshots.reload();
          }}
        />
      )}
    </section>
  );
}
