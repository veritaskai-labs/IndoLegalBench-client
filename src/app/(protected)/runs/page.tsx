"use client";

import Link from "next/link";
import { useState } from "react";

import { ActiveSessionsPanel } from "@/components/runs/ActiveSessionsPanel";
import { ArchivedSessionsPanel } from "@/components/runs/ArchivedSessionsPanel";
import { Tabs } from "@/components/ui";
import { tabElementId, tabPanelId } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";

type RunsTab = "active" | "archived";

const TABS = [
  { id: "active", label: "Sesi" },
  { id: "archived", label: "Arsip" },
] as const;

const TABS_PREFIX = "runs";

/** Halaman Eksekusi: daftar sesi pengukuran dan tab Arsip (PBI-11 AC10, SCRUM-212, SCRUM-264). */
export default function RunsPage() {
  const auth = useAuth();
  const me = auth.status === "authenticated" ? auth.user : null;
  const [tab, setTab] = useState<RunsTab>("active");

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Eksekusi</h1>
          <p className="text-sm text-slate-500">
            Sesi pengukuran otomatis, terbaru di atas. Sesi yang diarsipkan pindah ke tab Arsip, datanya tetap tersimpan.
          </p>
        </div>
        <Link
          href="/runs/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
        >
          Pengukuran Baru
        </Link>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} label="Daftar sesi" idPrefix={TABS_PREFIX} />

      <div role="tabpanel" id={tabPanelId(TABS_PREFIX, tab)} aria-labelledby={tabElementId(TABS_PREFIX, tab)}>
        {tab === "archived" ? <ArchivedSessionsPanel me={me} /> : <ActiveSessionsPanel me={me} />}
      </div>
    </div>
  );
}
