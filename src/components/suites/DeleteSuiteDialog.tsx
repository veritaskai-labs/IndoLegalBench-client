"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";

type Props = {
  suite: Suite;
  onClose: () => void;
  onDone: () => void;
};

export function DeleteSuiteDialog({ suite, onClose, onDone }: Props) {
  const [hasApprovedCases, setHasApprovedCases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setError(null);
    setBusy(true);

    try {
      await apiFetch(`/suites/${suite.id}`, { method: "DELETE" });
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === "SUITE_HAS_APPROVED_CASES") {
        setHasApprovedCases(true);
      } else {
        setError("Gagal menghapus suite. Coba lagi.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setError(null);
    setBusy(true);

    try {
      await apiFetch(`/suites/${suite.id}/archive`, { method: "POST" });
      onDone();
    } catch {
      setError("Gagal mengarsipkan suite. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hapus suite"
        className="w-full max-w-[520px] rounded-dialog bg-paper p-6 text-ink shadow-dialog"
      >
        <h2 className="font-serif text-[22px] font-medium leading-7 text-ink">
          Hapus suite
        </h2>

        {hasApprovedCases ? (
          <p className="mt-3 text-sm text-ink-soft">
            Suite {suite.name} berisi kasus yang sudah disetujui, jadi tidak bisa
            dihapus. Arsipkan saja supaya tidak lagi dipakai untuk pengukuran.
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            Hapus suite {suite.name}? Tindakan ini tidak bisa dibatalkan.
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-control bg-danger-wash px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          {hasApprovedCases ? (
            <Button variant="primary" onClick={handleArchive} disabled={busy}>
              Arsipkan saja
            </Button>
          ) : (
            <Button variant="danger" onClick={handleDelete} disabled={busy}>
              Hapus
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
