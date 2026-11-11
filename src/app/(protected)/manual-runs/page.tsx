"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ManualSessionTable } from "@/components/manual-runs/ManualSessionTable";
import { EmptyState, ErrorState } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useManualSessions } from "@/hooks/useManualSessions";

/**
 * Halaman daftar sesi pengukuran manual (PBI-22 AC8, AC11).
 * Dapat diakses oleh Admin dan Kontributor, termasuk sesi milik orang lain.
 */
export default function ManualRunsPage() {
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
          <h1 className="text-xl font-bold text-slate-900">Pengukuran Manual</h1>
          <p className="text-sm text-slate-500">
            Pencatatan dan pemantauan jawaban AI tanpa akses API (Justisio, LegalHero) oleh tim legal.
          </p>
        </div>
        {role === "admin" && (
          <Link
            href="/manual-runs/new"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            Pengukuran Manual Baru
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
            title="Belum ada sesi pengukuran manual"
            description="Admin membuat sesi pengukuran manual untuk diisi oleh tim legal."
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
