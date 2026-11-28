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
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import { isReviewerRole } from "@/lib/reviews/verdictRules";

type QueueTab = "queue" | "awaiting";

const TAB_PREFIX = "reviews";

const COPY = messages({
  id: {
    title: "Antrean tinjauan",
    tabsLabel: "Daftar tinjauan",
    queueTab: "Antrean tinjauan",
    awaitingTab: "Menunggu revisi penulis",
    loadingQueue: "Memuat antrean…",
    emptyQueueTitle: "Tidak ada kasus untuk ditinjau",
    emptyQueueDescription: "Kasus yang ditugaskan kepada Anda akan muncul di sini.",
    loadingCases: "Memuat kasus…",
    emptyAwaitingTitle: "Tidak ada kasus yang menunggu revisi",
    emptyAwaitingDescription: "Kasus yang sudah Anda nilai dan belum disetujui akan muncul di sini.",
    reviewersOnlyTitle: "Antrean tinjauan hanya untuk peninjau",
    reviewersOnlyDescription: "Akun Anda tidak ditugaskan menilai kasus. Admin memantau penilaian dari halaman admin.",
  },
  en: {
    title: "Review queue",
    tabsLabel: "Review lists",
    queueTab: "Review queue",
    awaitingTab: "Awaiting author revision",
    loadingQueue: "Loading the queue…",
    emptyQueueTitle: "No cases to review",
    emptyQueueDescription: "Cases assigned to you will appear here.",
    loadingCases: "Loading cases…",
    emptyAwaitingTitle: "No cases are awaiting revision",
    emptyAwaitingDescription: "Cases you have already reviewed and that are not yet approved will appear here.",
    reviewersOnlyTitle: "The review queue is only for reviewers",
    reviewersOnlyDescription: "Your account is not assigned to review cases. Admins monitor reviews from the admin page.",
  },
});

function ReviewQueuePanel() {
  const copy = useText(COPY);
  const queue = useAssignedReviews(true);

  if (queue.status === "loading") return <LoadingState label={copy.loadingQueue} />;
  if (queue.status === "error") return <ErrorState variant="card" message={queue.message} onRetry={queue.reload} />;
  if (queue.reviews.length === 0) {
    return (
      <EmptyState
        title={copy.emptyQueueTitle}
        description={copy.emptyQueueDescription}
      />
    );
  }
  return <ReviewQueueList reviews={queue.reviews} />;
}

/** Dipasang saat tab dibuka pertama kali, jadi daftar ini tidak diminta sebelum dibutuhkan. */
function AwaitingRevisionPanel() {
  const copy = useText(COPY);
  const queue = useAwaitingRevisionReviews(true);

  if (queue.status === "loading") return <LoadingState label={copy.loadingCases} />;
  if (queue.status === "error") return <ErrorState variant="card" message={queue.message} onRetry={queue.reload} />;
  if (queue.reviews.length === 0) {
    return (
      <EmptyState
        title={copy.emptyAwaitingTitle}
        description={copy.emptyAwaitingDescription}
      />
    );
  }
  return <AwaitingRevisionList reviews={queue.reviews} />;
}

/** Antrean tinjauan reviewer. Peran lain tidak memanggil server: jawabannya 403 dan itu melempar ke /forbidden. */
export default function ReviewsPage() {
  const copy = useText(COPY);
  const auth = useAuth();
  const isReviewer = isReviewerRole(auth.status === "authenticated" ? auth.user.role : null);
  const [tab, setTab] = useState<QueueTab>("queue");
  const [awaitingOpened, setAwaitingOpened] = useState(false);
  const tabs: readonly TabItem<QueueTab>[] = [
    { id: "queue", label: copy.queueTab },
    { id: "awaiting", label: copy.awaitingTab },
  ];

  if (auth.status !== "authenticated") return <LoadingState />;

  if (!isReviewer) {
    return (
      <EmptyState
        title={copy.reviewersOnlyTitle}
        description={copy.reviewersOnlyDescription}
      />
    );
  }

  function showTab(next: QueueTab) {
    setTab(next);
    if (next === "awaiting") setAwaitingOpened(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>

      <Tabs tabs={tabs} active={tab} onChange={showTab} label={copy.tabsLabel} idPrefix={TAB_PREFIX} />
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
