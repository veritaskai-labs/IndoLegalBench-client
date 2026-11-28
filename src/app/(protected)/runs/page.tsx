"use client";

import Link from "next/link";
import { useState } from "react";

import { ActiveSessionsPanel } from "@/components/runs/ActiveSessionsPanel";
import { ArchivedSessionsPanel } from "@/components/runs/ArchivedSessionsPanel";
import { Tabs } from "@/components/ui";
import { tabElementId, tabPanelId } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";

type RunsTab = "active" | "archived";

const COPY = messages({
  id: {
    title: "Pengukuran otomatis",
    description: "Sesi pengukuran otomatis, terbaru di atas. Sesi yang diarsipkan pindah ke tab Arsip, datanya tetap tersimpan.",
    newRun: "Pengukuran Baru",
    sessions: "Sesi",
    archived: "Arsip",
    list: "Daftar sesi",
  },
  en: {
    title: "Automatic measurement",
    description: "Automatic measurement sessions, newest first. Archived sessions move to the Archive tab, and their data stays stored.",
    newRun: "New measurement",
    sessions: "Sessions",
    archived: "Archive",
    list: "Session list",
  },
});

const TABS_PREFIX = "runs";

/** Halaman Eksekusi: daftar sesi pengukuran dan tab Arsip (PBI-11 AC10, SCRUM-212, SCRUM-264). */
export default function RunsPage() {
  const copy = useText(COPY);
  const auth = useAuth();
  const me = auth.status === "authenticated" ? auth.user : null;
  const [tab, setTab] = useState<RunsTab>("active");
  const tabs = [
    { id: "active" as const, label: copy.sessions },
    { id: "archived" as const, label: copy.archived },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="text-sm text-slate-500">{copy.description}</p>
        </div>
        <Link
          href="/runs/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
        >
          {copy.newRun}
        </Link>
      </header>

      <Tabs tabs={tabs} active={tab} onChange={setTab} label={copy.list} idPrefix={TABS_PREFIX} />

      <div role="tabpanel" id={tabPanelId(TABS_PREFIX, tab)} aria-labelledby={tabElementId(TABS_PREFIX, tab)}>
        {tab === "archived" ? <ArchivedSessionsPanel me={me} /> : <ActiveSessionsPanel me={me} />}
      </div>
    </div>
  );
}
