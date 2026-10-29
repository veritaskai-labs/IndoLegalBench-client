"use client";

import { CaseCountCards } from "@/components/dashboard/CaseCountCards";
import { NeedsReassignmentCard } from "@/components/dashboard/NeedsReassignmentCard";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { canViewDashboard } from "@/lib/auth";
import { formatWibClock } from "@/lib/datetime/formatWib";

/**
 * Dasbor sesuai peran (PBI-19 AC1, AC2, AC6).
 * Peran selain Kontributor dan Admin dijawab 403 oleh server, jadi dasbornya tidak dipanggil sama sekali.
 */
export default function DashboardPage() {
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const firstName = user === null ? "" : user.name.split(" ")[0];

  const allowed = canViewDashboard(user === null ? null : user.role);
  const dashboard = useDashboard(allowed);

  const refreshedAt =
    dashboard.status === "ready"
      ? formatWibClock(dashboard.summary.generated_at)
      : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          Selamat pagi, {firstName}
        </h1>
        {refreshedAt !== "" && (
          <p className="text-sm text-slate-500">Diperbarui {refreshedAt}</p>
        )}
      </div>

      {user !== null && !allowed && (
        <EmptyState
          title="Dasbor belum tersedia untuk peran Anda"
          description="Akun Anda hanya membaca kasus, jadi belum ada ringkasan kerja yang bisa ditampilkan."
        />
      )}

      {allowed && dashboard.status === "loading" && (
        <LoadingState label="Memuat ringkasan…" />
      )}

      {dashboard.status === "error" && (
        <ErrorState
          variant="card"
          message={dashboard.message}
          onRetry={dashboard.reload}
        />
      )}

      {dashboard.status === "ready" && (
        <>
          <CaseCountCards
            counts={dashboard.summary.case_counts}
            total={dashboard.summary.total_cases}
            waiting={dashboard.summary.waiting_for_review}
          />
          {dashboard.summary.needs_reassignment !== null && (
            <NeedsReassignmentCard
              count={dashboard.summary.needs_reassignment}
            />
          )}
          {dashboard.summary.review_queue !== null && (
            <ReviewQueue reviews={dashboard.summary.review_queue} />
          )}
        </>
      )}
    </div>
  );
}