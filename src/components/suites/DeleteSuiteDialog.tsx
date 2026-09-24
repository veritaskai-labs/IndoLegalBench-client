"use client";

import { useState } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hapus suite"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="text-base font-semibold text-slate-900">Hapus suite</h2>

        {hasApprovedCases ? (
          <p className="mt-3 text-sm text-slate-600">
            Suite {suite.name} berisi kasus yang sudah disetujui, jadi tidak bisa
            dihapus. Arsipkan saja supaya tidak lagi dipakai untuk pengukuran.
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Hapus suite {suite.name}? Tindakan ini tidak bisa dibatalkan.
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          {hasApprovedCases ? (
            <button
              type="button"
              onClick={handleArchive}
              disabled={busy}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Arsipkan saja
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}