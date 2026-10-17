"use client";

import { useCallback, useEffect, useState } from "react";

import { InReviewTable } from "@/components/reviews/InReviewTable";
import { ReassignmentTable } from "@/components/reviews/ReassignmentTable";
import { SwapReviewerDialog } from "@/components/reviews/SwapReviewerDialog";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useInReviewCases } from "@/hooks/useInReviewCases";
import { useNeedsReassignment } from "@/hooks/useNeedsReassignment";
import { useReplaceReviewer } from "@/hooks/useReplaceReviewer";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { isCaseCreator } from "@/lib/cases/versionCreator";
import { reviewerName } from "@/lib/reviews/reviewQueue";
import { reviewerCandidates } from "@/lib/reviews/reviewerCandidates";
import { listActiveUsers } from "@/lib/userApi";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";
import type { User } from "@/types/user-management";

type Tab = "queue" | "decisions";
type Target = { assignment: ReassignmentAssignment; row: ReassignmentRow };

const TAB_LABEL: Record<Tab, string> = {
  queue: "Perlu penugasan ulang",
  decisions: "Dalam review",
};

const TABS: Tab[] = ["queue", "decisions"];

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [target, setTarget] = useState<Target | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [authorId, setAuthorId] = useState<string | null>(null);

  const queue = useNeedsReassignment();
  const { reload } = queue;
  const inReview = useInReviewCases();

  const afterReplace = useCallback(() => {
    setTarget(null);
    reload();
  }, [reload]);

  const replacement = useReplaceReviewer(afterReplace);
  const { reset } = replacement;

  // Kandidat reviewer diambil sekali; daftar anggota tidak berubah selama halaman terbuka.
  useEffect(() => {
    let cancelled = false;
    listActiveUsers()
      .then((rows) => !cancelled && setUsers(rows))
      .catch(() => !cancelled && setUsers([]));
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * AC7 mengecualikan penulis kasus. Antrean dari server belum membawa field author,
   * jadi penulisnya dicari dari versi 1 lewat isCaseCreator — hanya saat dialog dibuka,
   * dan hanya di antara kandidat, karena di luar itu tidak berpengaruh.
   */
  useEffect(() => {
    if (target === null) return;

    let cancelled = false;
    listCaseVersions(target.row.case_id)
      .then((versions) => {
        if (cancelled) return;
        const author = users.find((item) => isCaseCreator(versions, item.id));
        setAuthorId(author?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setAuthorId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [target, users]);

  const openDialog = useCallback(
    (assignment: ReassignmentAssignment, row: ReassignmentRow) => {
      reset();
      setAuthorId(null);
      setTarget({ assignment, row });
    },
    [reset],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">
          Pemantauan review
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pantau kasus yang sedang direview dan tangani kasus yang kehilangan
          reviewer.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Tampilan pemantauan"
        className="flex gap-2 border-b border-slate-200"
      >
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={
              tab === name
                ? "-mb-px border-b-2 border-slate-900 px-3 py-2 text-sm font-medium text-slate-900"
                : "px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            }
          >
            {TAB_LABEL[name]}
          </button>
        ))}
      </div>

      {tab === "queue" ? (
        <section aria-label={TAB_LABEL.queue}>
          {queue.status === "error" ? (
            <ErrorState
              variant="card"
              message={queue.message}
              onRetry={reload}
            />
          ) : queue.status === "loading" ? (
            <LoadingSkeleton variant="lines" rows={5} />
          ) : queue.data.length === 0 ? (
            <EmptyState
              title="Tidak ada kasus yang perlu penugasan ulang"
              description="Semua ronde review yang berjalan masih punya reviewer aktif."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <ReassignmentTable rows={queue.data} onReplace={openDialog} />
            </div>
          )}
        </section>
      ) : (
        <section aria-label={TAB_LABEL.decisions}>
          {inReview.status === "error" ? (
            <ErrorState
              variant="card"
              message={inReview.message}
              onRetry={inReview.reload}
            />
          ) : inReview.status === "loading" ? (
            <LoadingSkeleton variant="lines" rows={5} />
          ) : inReview.data.length === 0 ? (
            <EmptyState
              title="Tidak ada kasus yang sedang direview"
              description="Kasus akan muncul di sini setelah Author mengajukannya untuk review."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <InReviewTable rows={inReview.data} />
            </div>
          )}
        </section>
      )}

      {target && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <SwapReviewerDialog
            caseCode={target.row.case_code}
            currentReviewerId={target.assignment.reviewer_id}
            currentReviewerName={reviewerName(target.assignment)}
            candidates={reviewerCandidates(users, target.row, authorId)}
            pending={replacement.pending}
            error={replacement.error}
            onConfirm={(body) =>
              void replacement.replace(target.assignment.id, body)
            }
            onClose={() => setTarget(null)}
          />
        </div>
      )}
    </div>
  );
}