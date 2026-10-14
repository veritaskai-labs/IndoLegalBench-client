"use client";

import { ReviewQueueList } from "@/components/reviews/ReviewQueueList";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAssignedReviews } from "@/hooks/useAssignedReviews";
import { useAuth } from "@/hooks/useAuth";

/** Antrean tinjauan reviewer. Peran lain tidak memanggil server: jawabannya 403 dan itu melempar ke /forbidden. */
export default function ReviewsPage() {
  const auth = useAuth();
  const isReviewer = auth.status === "authenticated" && auth.user.role === "reviewer";
  const queue = useAssignedReviews(isReviewer);

  if (auth.status !== "authenticated") return <LoadingState />;

  if (!isReviewer) {
    return (
      <EmptyState
        title="Antrean tinjauan hanya untuk peninjau"
        description="Akun Anda tidak ditugaskan menilai kasus. Admin memantau penilaian dari halaman admin."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Antrean tinjauan</h1>

      {queue.status === "loading" && <LoadingState label="Memuat antrean…" />}
      {queue.status === "error" && <ErrorState variant="card" message={queue.message} onRetry={queue.reload} />}
      {queue.status === "ready" &&
        (queue.reviews.length === 0 ? (
          <EmptyState
            title="Tidak ada kasus untuk ditinjau"
            description="Kasus yang ditugaskan kepada Anda akan muncul di sini."
          />
        ) : (
          <ReviewQueueList reviews={queue.reviews} />
        ))}
    </div>
  );
}
