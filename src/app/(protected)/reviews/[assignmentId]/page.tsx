"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CaseAuditHistory } from "@/components/audit/CaseAuditHistory";
import { OwnVerdictNotice } from "@/components/reviews/OwnVerdictNotice";
import { ReviewCaseContent } from "@/components/reviews/ReviewCaseContent";
import { SecondReviewerSlot } from "@/components/reviews/SecondReviewerSlot";
import { VerdictForm } from "@/components/reviews/VerdictForm";
import { Breadcrumb, EmptyState, ErrorState, Tabs, tabElementId, tabPanelId, type TabItem } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAssignedReview } from "@/hooks/useAssignedReview";
import { useAuth } from "@/hooks/useAuth";
import { useCaseReview } from "@/hooks/useCaseReview";
import { messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { blockerMessage } from "@/lib/reviews/reviewLabels";
import { isReviewerRole, reviewBlocker, submittedVerdict } from "@/lib/reviews/verdictRules";
import { decodeRouteParam } from "@/lib/routeParams";
import type { AssignedReview, VerdictResult } from "@/types/review";

const COPY = messages({
  id: {
    back: "Kembali ke antrean tinjauan",
    queue: "Antrean tinjauan",
    verdictTab: "Penilaian",
    historyTab: "Riwayat",
    sectionsLabel: "Bagian penilaian",
    notAssigned: "Akun Anda tidak ditugaskan menilai kasus ini.",
    loading: "Memuat penugasan…",
    missingTitle: "Penugasan tidak ditemukan",
    missingDescription:
      "Penugasan ini sudah selesai, diganti, atau bukan milik Anda. Antrean hanya memuat kasus yang masih ditinjau.",
  },
  en: {
    back: "Back to the review queue",
    queue: "Review queue",
    verdictTab: "Verdict",
    historyTab: "History",
    sectionsLabel: "Review sections",
    notAssigned: "Your account is not assigned to review this case.",
    loading: "Loading assignment…",
    missingTitle: "Assignment not found",
    missingDescription:
      "This assignment is finished, was replaced, or is not yours. The queue only lists cases still under review.",
  },
});

function BackToQueue() {
  const copy = useText(COPY);
  return (
    <Link href="/reviews" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
      {copy.back}
    </Link>
  );
}

type ReviewTab = "verdict" | "history";

const TAB_PREFIX = "review";

/** Satu penugasan yang sudah dimuat: isi kasus, form atau penilaian terkirim, dan peninjau kedua. */
function AssignmentReview({ assignment }: Readonly<{ assignment: AssignedReview }>) {
  const copy = useText(COPY);
  const [result, setResult] = useState<VerdictResult | null>(null);
  const [tab, setTab] = useState<ReviewTab>("verdict");
  const [historyOpened, setHistoryOpened] = useState(false);
  const tabs: readonly TabItem<ReviewTab>[] = [
    { id: "verdict", label: copy.verdictTab },
    { id: "history", label: copy.historyTab },
  ];
  const caseCopy = assignment.case;
  const verdict = submittedVerdict(result, assignment.my_verdict);
  // Kunci muat ulang: setelah verdict terkirim, round bisa saja sudah selesai dan penilaian kedua terbuka.
  const caseReview = useCaseReview(caseCopy.case_id, true, result?.submitted_at ?? "");

  function showTab(next: ReviewTab) {
    setTab(next);
    if (next === "history") setHistoryOpened(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumb items={[{ label: copy.queue, href: "/reviews" }, { label: assignment.case.case_code }]} />

      <Tabs tabs={tabs} active={tab} onChange={showTab} label={copy.sectionsLabel} idPrefix={TAB_PREFIX} />
      {/* Form tetap terpasang saat riwayat dibuka, supaya draf tidak hilang. */}
      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, "verdict")}
        aria-labelledby={tabElementId(TAB_PREFIX, "verdict")}
        hidden={tab !== "verdict"}
        className="space-y-6"
      >
        <ReviewCaseContent copy={caseCopy} />
        {/* K-09: penilaian sendiri dan peninjau kedua berdampingan. */}
        <div className="grid gap-6 md:grid-cols-2">
          {verdict === null ? (
            <VerdictForm assignmentId={assignment.assignment_id} versionNo={caseCopy.version_no} onSubmitted={setResult} />
          ) : (
            <OwnVerdictNotice
              assignmentId={assignment.assignment_id}
              verdict={verdict}
              roundStatus={result?.round_status ?? "open"}
              roundDecision={result?.round_decision ?? null}
            />
          )}
          <SecondReviewerSlot caseReview={caseReview} myAssignmentId={assignment.assignment_id} />
        </div>
      </div>
      {/* Riwayat dimuat saat tab pertama dibuka, lalu tetap terpasang. */}
      <div
        role="tabpanel"
        id={tabPanelId(TAB_PREFIX, "history")}
        aria-labelledby={tabElementId(TAB_PREFIX, "history")}
        hidden={tab !== "history"}
      >
        {historyOpened && <CaseAuditHistory key={result?.submitted_at ?? ""} caseId={caseCopy.case_id} />}
      </div>
    </div>
  );
}

/** Halaman penilaian satu penugasan. Hanya reviewer yang ditugaskan; selain itu tidak ada permintaan ke server. */
export default function ReviewAssignmentPage() {
  const copy = useText(COPY);
  // Blocker sentences follow the language mock. SCRUM-356 has no API yet.
  const locale = useLocale();
  const assignmentId = decodeRouteParam(useParams<{ assignmentId: string }>().assignmentId);
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const isReviewer = isReviewerRole(user?.role ?? null);
  const found = useAssignedReview(assignmentId, isReviewer);

  if (user === null) return <LoadingState />;

  if (!isReviewer) {
    return (
      <div className="space-y-3">
        <EmptyState title={blockerMessage("not_reviewer", locale)} description={copy.notAssigned} />
        <BackToQueue />
      </div>
    );
  }

  if (found.status === "loading") return <LoadingState label={copy.loading} />;

  if (found.status === "error") {
    return <ErrorState variant="card" message={found.message} onRetry={found.reload} />;
  }

  if (found.assignment === null) {
    return (
      <div className="space-y-3">
        <EmptyState title={copy.missingTitle} description={copy.missingDescription} />
        <BackToQueue />
      </div>
    );
  }

  const blocker = reviewBlocker(user, found.assignment.case.author_id);
  if (blocker !== null) {
    return (
      <div className="space-y-3">
        <ErrorState variant="card" message={blockerMessage(blocker, locale)} />
        <BackToQueue />
      </div>
    );
  }

  // key: pindah ke penugasan lain memulai dari keadaan bersih, tanpa sisa hasil kirim dari penugasan sebelumnya.
  return <AssignmentReview key={found.assignment.assignment_id} assignment={found.assignment} />;
}
