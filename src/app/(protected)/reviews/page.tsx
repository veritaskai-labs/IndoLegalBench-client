"use client";

import { useState } from "react";
import { AwaitingRevisionList } from "@/components/reviews/AwaitingRevisionList";
import { ReviewQueueList } from "@/components/reviews/ReviewQueueList";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Tabs, tabElementId, tabPanelId, type TabItem } from "@/components/ui/Tabs";
import { useAssignedReviews } from "@/hooks/useAssignedReviews";
import { useAuth } from "@/hooks/useAuth";
import { useAwaitingRevisionReviews } from "@/hooks/useAwaitingRevisionReviews";
import { isReviewerRole } from "@/lib/reviews/verdictRules";

type QueueTab = "queue" | "awaiting";

const TAB_PREFIX = "reviews";
const QUEUE_TABS: readonly TabItem<QueueTab>[] = [
  { id: "queue", label: "Antrean tinjauan" },
  { id: "awaiting", label: "Menunggu revisi penulis" },
];

function ReviewQueuePanel() {
  const queue = useAssignedReviews(true);

  if (queue.status === "loading") return <LoadingState label="Memuat antrean…" />;
  if (queue.status === "error") return <ErrorState variant="card" message={queue.message} onRetry={queue.reload} />;
  if (queue.reviews.length === 0) {
    return (
      <EmptyState
        title="Tidak ada kasus untuk ditinjau"
        description="Kasus yang ditugaskan kepada Anda akan muncul di sini."
      />
    );
  }
  return <ReviewQueueList reviews={queue.reviews} />;
}

/** Dipasang saat tab dibuka pertama kali, jadi daftar ini tidak diminta sebelum dibutuhkan. */
function AwaitingRevisionPanel() {
  const queue = useAwaitingRevisionReviews(true);

  if (queue.status === "loading") return <LoadingState label="Memuat kasus…" />;
  if (queue.status === "error") return <ErrorState variant="card" message={queue.message} onRetry={queue.reload} />;
  if (queue.reviews.length === 0) {
    return (
      <EmptyState
        title="Tidak ada kasus yang menunggu revisi"
        description="Kasus yang sudah Anda nilai dan belum disetujui akan muncul di sini."
      />
    );
  }
  return <AwaitingRevisionList reviews={queue.reviews} />;
}

/** Antrean tinjauan reviewer. Peran lain tidak memanggil server: jawabannya 403 dan itu melempar ke /forbidden. */
export default function ReviewsPage() {
  const auth = useAuth();
  const isReviewer = isReviewerRole(auth.status === "authenticated" ? auth.user.role : null);
  const [tab, setTab] = useState<QueueTab>("queue");
  const [awaitingOpened, setAwaitingOpened] = useState(false);

  if (auth.status !== "authenticated") return <LoadingState />;

  if (!isReviewer) {
    return (
      <EmptyState
        title="Antrean tinjauan hanya untuk peninjau"
        description="Akun Anda tidak ditugaskan menilai kasus. Admin memantau penilaian dari halaman admin."
      />
    );
  }

  function showTab(next: QueueTab) {
    setTab(next);
    if (next === "awaiting") setAwaitingOpened(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Antrean tinjauan</h1>

      <Tabs tabs={QUEUE_TABS} active={tab} onChange={showTab} label="Daftar tinjauan" idPrefix={TAB_PREFIX} />
      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, "queue")}
        aria-labelledby={tabElementId(TAB_PREFIX, "queue")}
        hidden={tab !== "queue"}
      >
        <ReviewQueuePanel />
      </div>
      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, "awaiting")}
        aria-labelledby={tabElementId(TAB_PREFIX, "awaiting")}
        hidden={tab !== "awaiting"}
      >
        {awaitingOpened && <AwaitingRevisionPanel />}
      </div>
    </div>
  );
}
