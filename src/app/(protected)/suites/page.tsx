"use client";

import { useState } from "react";
import { SuiteFormDialog } from "@/components/suites/SuiteFormDialog";
import { SuiteList } from "@/components/suites/SuiteList";
import { useSuites } from "@/hooks/useSuites";
import type { Suite, SuiteStatus } from "@/types/suite";
import { DeleteSuiteDialog } from "@/components/suites/DeleteSuiteDialog";
import { apiFetch } from "@/lib/apiClient";

const TABS: { value: SuiteStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "archived", label: "Arsip" },
];

export default function SuitesPage() {
  const [status, setStatus] = useState<SuiteStatus>("active");
  const suites = useSuites(status);
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
   async function toggleArchive(suite: Suite) {
    const action = suite.status === "archived" ? "unarchive" : "archive";
    try {
      await apiFetch(`/suites/${suite.id}/${action}`, { method: "POST" });
      suites.reload();
    } catch {    }
  }
  type DialogState = | { mode: "closed" } | { mode: "create" } | { mode: "edit"; suite: Suite } | { mode: "delete"; suite: Suite };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Suite</h1>
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Buat Suite
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Status suite"
        className="flex gap-1 border-b border-slate-200"
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
              className={
                selected
                  ? "border-b-2 border-slate-900 px-4 py-2 text-sm font-medium text-slate-900"
                  : "border-b-2 border-transparent px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <SuiteList
        status={suites.status}
        suites={suites.suites}
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