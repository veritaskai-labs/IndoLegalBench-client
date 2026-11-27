"use client";

import { useMemo, useState } from "react";
import { SuiteCaseNav } from "@/components/cases/SuiteCaseNav";
import { DeleteSuiteDialog } from "@/components/suites/DeleteSuiteDialog";
import { SuiteFormDialog } from "@/components/suites/SuiteFormDialog";
import { SuiteList } from "@/components/suites/SuiteList";
import { Button, ErrorState, Icon, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useSuites } from "@/hooks/useSuites";
import { apiFetch } from "@/lib/apiClient";
import { isDeveloperAiSession } from "@/lib/auth";
import { canCreateCase } from "@/lib/cases/permissions";
import type { Suite, SuiteStatus } from "@/types/suite";

const TABS: { value: SuiteStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "archived", label: "Arsip" },
];

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; suite: Suite }
  | { mode: "delete"; suite: Suite };

export default function SuitesPage() {
  const [status, setStatus] = useState<SuiteStatus>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const suites = useSuites(status);
  const auth = useAuth();
  const { showToast } = useToast();
  const canCreate = canCreateCase(
    auth.status === "authenticated" ? auth.user.role : null,
  );
  // Developer AI hanya membaca: tanpa buat, ubah, arsip, atau hapus suite (SCRUM-184).
  const canManage = auth.status === "authenticated" && !isDeveloperAiSession(auth);
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredSuites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return suites.suites;
    return suites.suites.filter(
      (suite) =>
        suite.name.toLowerCase().includes(query) ||
        (suite.description ?? "").toLowerCase().includes(query),
    );
  }, [suites.suites, searchQuery]);

  async function toggleArchive(suite: Suite) {
    const action = suite.status === "archived" ? "unarchive" : "archive";
    setActionError(null);

    try {
      await apiFetch(`/suites/${suite.id}/${action}`, { method: "POST" });
      suites.reload();
      if (action === "archive") {
        showToast(
          <>
            Suite <strong>{suite.name}</strong> berhasil diarsipkan.
          </>,
          {
            label: "Batalkan pengarsipan",
            onClick: () => {
              void toggleArchive({ ...suite, status: "archived" });
            },
          },
        );
      } else {
        showToast(
          <>
            Suite <strong>{suite.name}</strong> berhasil diaktifkan.
          </>,
        );
      }
    } catch {
      setActionError(
        action === "archive"
          ? "Gagal mengarsipkan suite. Coba lagi."
          : "Gagal mengaktifkan suite. Coba lagi.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl leading-10 text-ink">Suite dan kasus</h1>
        <p className="mt-2 text-sm text-muted">
          Kelompok kasus uji hukum. Buka suite untuk melihat, menambah, dan mengelola kasus di dalamnya.
        </p>
      </header>

      {canCreate && <SuiteCaseNav current="/suites" />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Cari suite</span>
          <Icon name="cari" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            placeholder="Cari suite"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </label>

        {canManage && (
          <Button
            variant="primary"
            onClick={() => setDialog({ mode: "create" })}
            className="w-full sm:w-auto"
          >
            <Icon name="tambah" size={14} />
            Buat Suite
          </Button>
        )}
      </div>

      <div>
        <div
          role="tablist"
          aria-label="Status suite"
          className="inline-flex divide-x divide-line overflow-hidden rounded-control border border-line bg-paper"
        >
          {TABS.map((tab) => {
            const selected = status === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setStatus(tab.value)}
                className={`cursor-pointer px-5 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-accent-wash text-accent-ink"
                    : "bg-paper text-ink-soft hover:bg-surface-hover hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {actionError && <ErrorState variant="banner" message={actionError} />}

      <SuiteList
        status={suites.status}
        suites={filteredSuites}
        filterKey={`${status}:${searchQuery.trim()}`}
        isFiltered={searchQuery.trim() !== ""}
        onResetSearch={() => setSearchQuery("")}
        canCreateCase={canCreate}
        canManage={canManage}
        onRetry={suites.reload}
        onEdit={(suite) => setDialog({ mode: "edit", suite })}
        onDelete={(suite) => setDialog({ mode: "delete", suite })}
        onArchive={toggleArchive}
      />

      {(dialog.mode === "create" || dialog.mode === "edit") && (
        <SuiteFormDialog
          suite={dialog.mode === "edit" ? dialog.suite : undefined}
          onClose={() => setDialog({ mode: "closed" })}
          onSaved={() => {
            setDialog({ mode: "closed" });
            suites.reload();
          }}
        />
      )}

      {dialog.mode === "delete" && (
        <DeleteSuiteDialog
          suite={dialog.suite}
          onClose={() => setDialog({ mode: "closed" })}
          onDone={() => {
            setDialog({ mode: "closed" });
            suites.reload();
          }}
        />
      )}
    </div>
  );
}
