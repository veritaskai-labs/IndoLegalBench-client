"use client";

import { useState } from "react";
import { SuiteList } from "@/components/suites/SuiteList";
import { useSuites } from "@/hooks/useSuites";
import type { SuiteStatus } from "@/types/suite";

const TABS: { value: SuiteStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "archived", label: "Arsip" },
];

export default function SuitesPage() {
  const [status, setStatus] = useState<SuiteStatus>("active");
  const suites = useSuites(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Suite</h1>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Buat Suite
        </button>
      </div>

      <div role="tablist" aria-label="Status suite" className="flex gap-1 border-b border-slate-200">
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
      />
    </div>
  );
}