"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ManualCaseCard } from "@/components/manual-runs/ManualCaseCard";
import { ManualSessionHeader } from "@/components/manual-runs/ManualSessionHeader";
import { useAuth } from "@/hooks/useAuth";
import { useManualSessionDetail } from "@/hooks/useManualSessionDetail";
import { decodeRouteParam } from "@/lib/routeParams";

import type { ManualSessionDetail } from "@/types/measurement";

/**
 * Halaman detail dan progres sesi pengukuran manual (PBI-22 AC3, AC4, AC8, AC11-AC13).
 * Menampilkan ringkasan status, progres pengisian, serta kartu kasus.
 */
export default function ManualSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = decodeRouteParam(params?.id ?? "");
  const auth = useAuth();
  const router = useRouter();

  const [unfilledOnly, setUnfilledOnly] = useState(false);
  const detail = useManualSessionDetail(sessionId, unfilledOnly);

  const [cachedSession, setCachedSession] = useState<ManualSessionDetail | null>(null);
  if (detail.status === "ready" && detail.data !== cachedSession) {
    setCachedSession(detail.data);
  }

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

  if (detail.status === "loading" && !cachedSession) return <LoadingState />;

  if (detail.status === "error" && !cachedSession) {
    return (
      <div className="space-y-4">
        <ErrorState
          variant="card"
          message={detail.message}
          onRetry={detail.reload}
        />
        <Link
          href="/manual-runs"
          className="text-sm font-medium text-slate-900 hover:underline"
        >
          Kembali ke Pengukuran Manual
        </Link>
      </div>
    );
  }

  const session = detail.status === "ready" ? detail.data : cachedSession;
  if (!session) return null;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Pengukuran Manual", onClick: () => router.push("/manual-runs") },
          { label: session.label },
        ]}
      />

      <ManualSessionHeader
        session={session}
        role={role}
        unfilledOnly={unfilledOnly}
        onToggleUnfilled={setUnfilledOnly}
        onSessionUpdated={detail.reload}
      />

      <section aria-label="Daftar kasus snapshot" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Daftar Kasus ({session.cases.length})
          </h2>
          {unfilledOnly && (
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Menampilkan kasus belum terisi saja
            </span>
          )}
        </div>

        {detail.status === "loading" ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8">
            <LoadingState />
          </div>
        ) : detail.status === "error" ? (
          <ErrorState
            variant="card"
            message={detail.message}
            onRetry={detail.reload}
          />
        ) : session.cases.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {unfilledOnly
              ? "Semua kasus pada sesi ini telah selesai diisi."
              : "Belum ada kasus pada sesi ini."}
          </div>
        ) : (
          <div className="space-y-4">
            {session.cases.map((caseItem) => (
              <ManualCaseCard key={caseItem.snapshot_item_id} caseItem={caseItem} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
