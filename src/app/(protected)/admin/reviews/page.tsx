"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";

import { InReviewTable } from "@/components/reviews/InReviewTable";
import { ReassignmentTable } from "@/components/reviews/ReassignmentTable";
import { SwapReviewerDialog } from "@/components/reviews/SwapReviewerDialog";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useInReviewCases } from "@/hooks/useInReviewCases";
import { useNeedsReassignment } from "@/hooks/useNeedsReassignment";
import { useReplaceReviewer } from "@/hooks/useReplaceReviewer";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { isCaseCreator } from "@/lib/cases/versionCreator";
import { activeAssignments, reviewerName } from "@/lib/reviews/reviewQueue";
import { candidatesExcept } from "@/lib/reviews/reviewerCandidates";
import { listActiveUsers } from "@/lib/userApi";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
  ReviewerSlot,
} from "@/types/reviewAdmin";
import type { User } from "@/types/user-management";

type Tab = "queue" | "decisions";

/**
 * Penugasan yang sedang diganti, dalam bentuk yang tidak terikat pada tabel asalnya:
 * antrean dan tab "Dalam review" memberi data yang sama lewat dua jalan berbeda (AC7, AC8).
 */
type Target = {
  assignmentId: string;
  caseId: string;
  caseCode: string;
  reviewerId: string;
  reviewerName: string;
  takenReviewerIds: string[];
};

const TAB_LABEL: Record<Tab, string> = {
  queue: "Perlu penugasan ulang",
  decisions: "Dalam review",
};

const TABS: Tab[] = ["queue", "decisions"];

/**
 * Dua panggilan latar menyiapkan isi dialog. Kalau salah satunya gagal, admin harus tahu,
 * karena akibatnya terlihat sebagai daftar kosong atau penulis yang ikut muncul.
 */
function dialogNotice(usersFailed: boolean, authorFailed: boolean): string | null {
  if (usersFailed) {
    return "Daftar reviewer gagal dimuat, jadi pilihannya bisa kosong. Muat ulang halaman.";
  }
  if (authorFailed) {
    return "Penulis kasus tidak bisa dicek, jadi ia mungkin ikut terdaftar. Server tetap menolak bila penulis yang dipilih.";
  }
  return null;
}

/** Isi tab antrean: gagal, memuat, kosong, lalu tabelnya. Dipisah agar halamannya tetap terbaca. */
function ReassignmentPanel({
  queue,
  onReplace,
}: Readonly<{
  queue: ReturnType<typeof useNeedsReassignment>;
  onReplace: (assignment: ReassignmentAssignment, row: ReassignmentRow) => void;
}>) {
  if (queue.status === "error") {
    return (
      <ErrorState variant="card" message={queue.message} onRetry={queue.reload} />
    );
  }

  if (queue.status === "loading") {
    return <LoadingSkeleton variant="lines" rows={5} />;
  }

  if (queue.data.length === 0) {
    return (
      <EmptyState
        title="Tidak ada kasus yang perlu penugasan ulang"
        description="Semua ronde review yang berjalan masih punya reviewer aktif."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <ReassignmentTable rows={queue.data} onReplace={onReplace} />
    </div>
  );
}

/** Isi tab kasus yang sedang direview, dengan urutan keadaan yang sama. */
function InReviewPanel({
  inReview,
  onReplace,
}: Readonly<{
  inReview: ReturnType<typeof useInReviewCases>;
  onReplace: (slot: ReviewerSlot, row: InReviewRow) => void;
}>) {
  if (inReview.status === "error") {
    return (
      <ErrorState
        variant="card"
        message={inReview.message}
        onRetry={inReview.reload}
      />
    );
  }

  if (inReview.status === "loading") {
    return <LoadingSkeleton variant="lines" rows={5} />;
  }

  if (inReview.data.length === 0) {
    return (
      <EmptyState
        title="Tidak ada kasus yang sedang direview"
        description="Kasus akan muncul di sini setelah Author mengajukannya untuk review."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <InReviewTable rows={inReview.data} onReplace={onReplace} />
    </div>
  );
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [target, setTarget] = useState<Target | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersFailed, setUsersFailed] = useState(false);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [authorFailed, setAuthorFailed] = useState(false);

  const queue = useNeedsReassignment();
  const { reload } = queue;
  const inReview = useInReviewCases();
  const { reload: reloadInReview } = inReview;

  /** Satu penggantian mengubah dua daftar sekaligus, jadi keduanya dimuat ulang. */
  const reloadBoth = useCallback(() => {
    reload();
    reloadInReview();
  }, [reload, reloadInReview]);

  const afterReplace = useCallback(() => {
    setTarget(null);
    reloadBoth();
  }, [reloadBoth]);

  const replacement = useReplaceReviewer(afterReplace, reloadBoth);
  const { reset } = replacement;

  // Kandidat reviewer diambil sekali; daftar anggota tidak berubah selama halaman terbuka.
  useEffect(() => {
    let cancelled = false;
    listActiveUsers()
      .then((rows) => {
        if (cancelled) return;
        setUsers(rows);
        setUsersFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUsers([]);
        setUsersFailed(true);
      });
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
    listCaseVersions(target.caseId)
      .then((versions) => {
        if (cancelled) return;
        const author = users.find((item) => isCaseCreator(versions, item.id));
        setAuthorId(author?.id ?? null);
        setAuthorFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthorId(null);
        setAuthorFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [target, users]);

  const openDialog = useCallback(
    (next: Target) => {
      reset();
      setAuthorId(null);
      setAuthorFailed(false);
      setTarget(next);
    },
    [reset],
  );

  /** Dari antrean (AC8): yang terpakai adalah reviewer yang masih aktif di ronde itu. */
  const openFromQueue = useCallback(
    (assignment: ReassignmentAssignment, row: ReassignmentRow) => {
      openDialog({
        assignmentId: assignment.id,
        caseId: row.case_id,
        caseCode: row.case_code,
        reviewerId: assignment.reviewer_id,
        reviewerName: reviewerName(assignment),
        takenReviewerIds: activeAssignments(row).map(
          (item) => item.reviewer_id,
        ),
      });
    },
    [openDialog],
  );

  /** Dari tab "Dalam review" (AC7): penugasan aktif kasus mana pun, bukan hanya yang di antrean. */
  const openFromReview = useCallback(
    (slot: ReviewerSlot, row: InReviewRow) => {
      openDialog({
        assignmentId: slot.assignment_id,
        caseId: row.case.id,
        caseCode: row.case.case_code,
        reviewerId: slot.reviewer.id,
        reviewerName: slot.reviewer.name,
        takenReviewerIds: (row.review?.reviewers ?? [])
          .filter((item) => item.status === "active")
          .map((item) => item.reviewer.id),
      });
    },
    [openDialog],
  );

  /** Pola tablist: panah kiri/kanan berpindah tab dan memindahkan fokus, hanya ada dua tab. */
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>) => {    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next: Tab = tab === "queue" ? "decisions" : "queue";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

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
            id={`tab-${name}`}
            type="button"
            role="tab"
            aria-selected={tab === name}
            aria-controls={`panel-${name}`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
            onKeyDown={moveTab}
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
        <section
          id="panel-queue"
          role="tabpanel"
          aria-labelledby="tab-queue"
        >
          <ReassignmentPanel queue={queue} onReplace={openFromQueue} />
        </section>
      ) : (
        <section
          id="panel-decisions"
          role="tabpanel"
          aria-labelledby="tab-decisions"
        >
          <InReviewPanel inReview={inReview} onReplace={openFromReview} />
        </section>
      )}

      {target && (
        <SwapReviewerDialog
          caseCode={target.caseCode}
          currentReviewerId={target.reviewerId}
          currentReviewerName={target.reviewerName}
          candidates={candidatesExcept(users, target.takenReviewerIds, authorId)}
          notice={dialogNotice(usersFailed, authorFailed)}
          pending={replacement.pending}
          error={replacement.error}
          onConfirm={(body) =>
            void replacement.replace(target.assignmentId, body)
          }
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}