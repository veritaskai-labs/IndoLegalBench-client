"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { CHROME } from "@/lib/i18n/chrome";
import { fill, messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import type { Suite } from "@/types/suite";

const COPY = messages({
  id: {
    title: "Hapus suite",
    deleteFailed: "Gagal menghapus suite. Coba lagi.",
    archiveFailed: "Gagal mengarsipkan suite. Coba lagi.",
    blocked: "Suite {name} berisi kasus yang sudah disetujui, jadi tidak bisa dihapus. Arsipkan saja supaya tidak lagi dipakai untuk pengukuran.",
    confirm: "Hapus suite {name}? Tindakan ini tidak bisa dibatalkan.",
    archiveInstead: "Arsipkan saja",
    remove: "Hapus",
  },
  en: {
    title: "Remove suite",
    deleteFailed: "Could not delete the suite. Try again.",
    archiveFailed: "Could not archive the suite. Try again.",
    blocked: "Suite {name} contains cases that are already approved, so it cannot be deleted. Archive it instead so it is no longer used for measurement.",
    confirm: "Remove suite {name}? This cannot be undone.",
    archiveInstead: "Archive instead",
    remove: "Remove",
  },
});

type Props = {
  suite: Suite;
  onClose: () => void;
  onDone: () => void;
};

export function DeleteSuiteDialog({ suite, onClose, onDone }: Readonly<Props>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
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
        setError(copy.deleteFailed);
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
      setError(copy.archiveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <dialog
        open
        aria-modal="true"
        aria-label={copy.title}
        className="static m-0 w-full max-w-[520px] rounded-dialog bg-paper p-6 text-ink shadow-dialog"
      >
        <h2 className="font-serif text-[22px] font-medium leading-7 text-ink">
          {copy.title}
        </h2>

        {hasApprovedCases ? (
          <p className="mt-3 text-sm text-ink-soft">{fill(copy.blocked, { name: suite.name })}</p>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">{fill(copy.confirm, { name: suite.name })}</p>
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
            {chrome.cancel}
          </Button>
          {hasApprovedCases ? (
            <Button variant="primary" onClick={handleArchive} disabled={busy}>
              {copy.archiveInstead}
            </Button>
          ) : (
            <Button variant="danger" onClick={handleDelete} disabled={busy}>
              {copy.remove}
            </Button>
          )}
        </div>
      </dialog>
    </div>
  );
}
