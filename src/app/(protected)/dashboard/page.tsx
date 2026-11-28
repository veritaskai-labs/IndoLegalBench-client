"use client";

import { CaseCountCards } from "@/components/dashboard/CaseCountCards";
import { NeedsReassignmentCard } from "@/components/dashboard/NeedsReassignmentCard";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { canViewDashboard } from "@/lib/auth";
import { formatWibClock } from "@/lib/datetime/formatWib";

/**
 * Beranda sesuai peran (PBI-19 AC1, AC2, AC6), dengan tampilan dari desain SCRUM-347.
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
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl leading-10 text-ink">Beranda</h1>
          <p className="mt-2 text-muted">
            {firstName === "" ? "Selamat pagi." : `Selamat pagi, ${firstName}.`} Ringkasan status pengukuran dan hal
            yang perlu ditindaklanjuti.
          </p>
        </div>
        {allowed && (
          <button
            type="button"
            onClick={dashboard.reload}
            title="Muat ulang data"
            className="inline-flex items-center gap-1.5 rounded-control pb-1.5 text-muted transition-colors hover:text-ink"
          >
            <Icon name="muatUlang" size={14} />
            <span className="sr-only">Muat ulang data. </span>
            <span>{refreshedAt === "" ? "Muat ulang" : `Diperbarui ${refreshedAt}`}</span>
          </button>
        )}
      </header>

      {user !== null && !allowed && (
        <EmptyState
          title="Beranda belum tersedia untuk peran Anda"
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
          {dashboard.summary.own_cases && (
            <CaseCountCards
              title="Kasus Anda"
              counts={dashboard.summary.own_cases.case_counts}
              total={dashboard.summary.own_cases.total_cases}
              emptyNote="Anda belum menulis kasus."
            />
          )}
          <CaseCountCards
            counts={dashboard.summary.case_counts}
            total={dashboard.summary.total_cases}
            waiting={dashboard.summary.waiting_for_review}
          >
            {dashboard.summary.needs_reassignment !== null && (
              <NeedsReassignmentCard count={dashboard.summary.needs_reassignment} />
            )}
          </CaseCountCards>
          {dashboard.summary.review_queue !== null && (
            <ReviewQueue reviews={dashboard.summary.review_queue} />
          )}
        </>
      )}
    </div>
  );
}