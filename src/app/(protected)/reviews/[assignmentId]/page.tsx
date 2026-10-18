"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CaseAuditHistory } from "@/components/audit/CaseAuditHistory";
import { OwnVerdictNotice } from "@/components/reviews/OwnVerdictNotice";
import { ReviewCaseContent } from "@/components/reviews/ReviewCaseContent";
import { SecondReviewerPanel } from "@/components/reviews/SecondReviewerPanel";
import { VerdictForm } from "@/components/reviews/VerdictForm";
import { Breadcrumb, EmptyState, ErrorState, Tabs, tabElementId, tabPanelId, type TabItem } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAssignedReview } from "@/hooks/useAssignedReview";
import { useAuth } from "@/hooks/useAuth";
import { useCaseReview } from "@/hooks/useCaseReview";
import { BLOCKER_MESSAGE } from "@/lib/reviews/reviewLabels";
import { isReviewerRole, reviewBlocker, submittedVerdict } from "@/lib/reviews/verdictRules";
import { decodeRouteParam } from "@/lib/routeParams";
import type { AssignedReview, VerdictResult } from "@/types/review";

const BACK_LINK = (
  <Link href="/reviews" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
    Kembali ke antrean tinjauan
  </Link>
);

type ReviewTab = "verdict" | "history";

const TAB_PREFIX = "review";
const REVIEW_TABS: readonly TabItem<ReviewTab>[] = [
  { id: "verdict", label: "Penilaian" },
  { id: "history", label: "Riwayat" },
];

/** Satu penugasan yang sudah dimuat: isi kasus, form atau penilaian terkirim, dan peninjau kedua. */
function AssignmentReview({ assignment }: Readonly<{ assignment: AssignedReview }>) {
  const [result, setResult] = useState<VerdictResult | null>(null);
  const [tab, setTab] = useState<ReviewTab>("verdict");
  const [historyOpened, setHistoryOpened] = useState(false);
  const copy = assignment.case;
  const verdict = submittedVerdict(result, assignment.my_verdict);
  // Kunci muat ulang: setelah verdict terkirim, round bisa saja sudah selesai dan penilaian kedua terbuka.
  const caseReview = useCaseReview(copy.case_id, true, result?.submitted_at ?? "");

  function showTab(next: ReviewTab) {
    setTab(next);
    if (next === "history") setHistoryOpened(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumb items={[{ label: "Antrean tinjauan", href: "/reviews" }, { label: copy.case_code }]} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Tabs tabs={REVIEW_TABS} active={tab} onChange={showTab} label="Bagian penilaian" idPrefix={TAB_PREFIX} />
          {/* Form tetap terpasang saat riwayat dibuka, supaya draf tidak hilang. */}
          <div
            role="tabpanel"
            id={tabPanelId(TAB_PREFIX, "verdict")}
            aria-labelledby={tabElementId(TAB_PREFIX, "verdict")}
            hidden={tab !== "verdict"}
            className="space-y-6"
          >
            <ReviewCaseContent copy={copy} />
            {verdict === null ? (
              <VerdictForm assignmentId={assignment.assignment_id} versionNo={copy.version_no} onSubmitted={setResult} />
            ) : (
              <OwnVerdictNotice
                verdict={verdict}
                roundStatus={result?.round_status ?? "open"}
                roundDecision={result?.round_decision ?? null}
              />
            )}
          </div>
          {/* Riwayat dimuat saat tab pertama dibuka, lalu tetap terpasang. */}
          <div
            role="tabpanel"
            id={tabPanelId(TAB_PREFIX, "history")}
            aria-labelledby={tabElementId(TAB_PREFIX, "history")}
            hidden={tab !== "history"}
          >
            {historyOpened && <CaseAuditHistory caseId={copy.case_id} />}
          </div>
        </div>

        <aside>
          {caseReview.status === "loading" && <LoadingState label="Memuat peninjau kedua…" />}
          {caseReview.status === "error" && <ErrorState message={caseReview.message} onRetry={caseReview.reload} />}
          {caseReview.status === "ready" && caseReview.review !== null && (
            <SecondReviewerPanel review={caseReview.review} myAssignmentId={assignment.assignment_id} />
          )}
        </aside>
      </div>
    </div>
  );
}

/** Halaman penilaian satu penugasan. Hanya reviewer yang ditugaskan; selain itu tidak ada permintaan ke server. */
export default function ReviewAssignmentPage() {
  const assignmentId = decodeRouteParam(useParams<{ assignmentId: string }>().assignmentId);
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const isReviewer = isReviewerRole(user?.role ?? null);
  const found = useAssignedReview(assignmentId, isReviewer);

  if (user === null) return <LoadingState />;

  if (!isReviewer) {
    return (
      <div className="space-y-3">
        <EmptyState title={BLOCKER_MESSAGE.not_reviewer} description="Akun Anda tidak ditugaskan menilai kasus ini." />
        {BACK_LINK}
      </div>
    );
  }

  if (found.status === "loading") return <LoadingState label="Memuat penugasan…" />;

  if (found.status === "error") {
    return <ErrorState variant="card" message={found.message} onRetry={found.reload} />;
  }

  if (found.assignment === null) {
    return (
      <div className="space-y-3">
        <EmptyState
          title="Penugasan tidak ditemukan"
          description="Penugasan ini sudah selesai, diganti, atau bukan milik Anda. Antrean hanya memuat kasus yang masih ditinjau."
        />
        {BACK_LINK}
      </div>
    );
  }

  const blocker = reviewBlocker(user, found.assignment.case.author_id);
  if (blocker !== null) {
    return (
      <div className="space-y-3">
        <ErrorState variant="card" message={BLOCKER_MESSAGE[blocker]} />
        {BACK_LINK}
      </div>
    );
  }

  // key: pindah ke penugasan lain memulai dari keadaan bersih, tanpa sisa hasil kirim dari penugasan sebelumnya.
  return <AssignmentReview key={found.assignment.assignment_id} assignment={found.assignment} />;
}
