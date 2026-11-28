"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ManualSessionTable } from "@/components/manual-runs/ManualSessionTable";
import { EmptyState, ErrorState } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useManualSessions } from "@/hooks/useManualSessions";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";

const COPY = messages({
  id: {
    title: "Pengukuran manual",
    description: "Pencatatan dan pemantauan jawaban AI tanpa akses API (Justisio, LegalHero) oleh tim legal.",
    newRun: "Pengukuran manual baru",
    emptyTitle: "Belum ada sesi pengukuran manual",
    emptyDescription: "Admin membuat sesi pengukuran manual untuk diisi oleh tim legal.",
  },
  en: {
    title: "Manual measurement",
    description: "Recording and monitoring AI answers without API access (Justisio, LegalHero) by the legal team.",
    newRun: "New manual measurement",
    emptyTitle: "No manual measurement sessions yet",
    emptyDescription: "An Admin creates a manual measurement session for the legal team to fill in.",
  },
});

/**
 * Halaman daftar sesi pengukuran manual (PBI-22 AC8, AC11).
 * Dapat diakses oleh Admin dan Kontributor, termasuk sesi milik orang lain.
 */
export default function ManualRunsPage() {
  const copy = useText(COPY);
  const auth = useAuth();
  const router = useRouter();
  const sessions = useManualSessions();

  const isAuthenticated = auth.status === "authenticated";
  const role = isAuthenticated ? auth.user.role : null;
  const isAllowed = role === "admin" || role === "contributor";

  useEffect(() => {
    if (isAuthenticated && !isAllowed) {
      router.replace("/forbidden");
    }
  }, [isAuthenticated, isAllowed, router]);

  if (!isAuthenticated) return <LoadingState />;
  if (!isAllowed) return null;

  const rows = sessions.status === "ready" ? sessions.data : [];
  const isEmpty = sessions.status === "ready" && rows.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{copy.title}</h1>
          <p className="text-sm text-slate-500">{copy.description}</p>
        </div>
        {role === "admin" && (
          <Link
            href="/manual-runs/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-control bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-hover transition-colors"
          >
            <span aria-hidden="true">+</span>
            <span>{copy.newRun}</span>
          </Link>
        )}
      </header>

      {sessions.status === "error" && (
        <ErrorState
          variant="card"
          message={sessions.message}
          onRetry={sessions.reload}
        />
      )}

      {isEmpty && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <EmptyState
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        </div>
      )}

      {(sessions.status === "loading" || rows.length > 0) && (
        <ManualSessionTable
          sessions={rows}
          loading={sessions.status === "loading"}
        />
      )}
    </div>
  );
}
