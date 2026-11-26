"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { InReviewTable } from "@/components/reviews/InReviewTable";
import { ReassignmentTable } from "@/components/reviews/ReassignmentTable";
import { SwapReviewerDialog } from "@/components/reviews/SwapReviewerDialog";
import { EmptyState, ErrorState, LoadingSkeleton, LoadingState } from "@/components/ui";
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
  ReplaceReviewerBody,
} from "@/types/reviewAdmin";
import type { User } from "@/types/user-management";

type Tab = "queue" | "decisions";
type AuthorLookup = {
  request: Promise<string | null>;
  authorId?: string | null;
};

const feedbackClass = "block rounded-control bg-surface p-3 text-sm";

/**
 * Penugasan yang sedang diganti, dalam bentuk yang tidak terikat pada tabel asalnya:
 * antrean dan tab "Dalam review" memberi data yang sama lewat dua jalan berbeda (AC7, AC8).
 */
type Target = {
  assignmentId: string;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  roundNo: number;
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
    return <LoadingState label="Memuat penugasan…" />;
  }

  if (queue.data.length === 0) {
    return (
      <EmptyState
        title="Tidak ada kasus yang perlu penugasan ulang"
        description="Semua ronde review yang berjalan masih punya reviewer aktif."
      />
    );
  }

  return <ReassignmentTable rows={queue.data} onReplace={onReplace} />;
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
        description="Kasus akan muncul di sini setelah Kontributor mengajukannya untuk review."
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
  const [users, setUsers] = useState<User[] | null>(null);
  const [usersFailed, setUsersFailed] = useState(false);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [authorFailed, setAuthorFailed] = useState(false);

  const [checkingAuthor, setCheckingAuthor] = useState(false);
  const [success, setSuccess] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const successFeedback = useRef<HTMLOutputElement>(null);
  const errorFeedback = useRef<HTMLParagraphElement>(null);
  const authorLookups = useRef(new Map<string, AuthorLookup>());

  const queue = useNeedsReassignment();
  const { reload } = queue;
  const inReview = useInReviewCases();
  const { reload: reloadInReview } = inReview;

  /** Satu penggantian mengubah dua daftar sekaligus, jadi keduanya dimuat ulang. */
  const reloadBoth = useCallback(() => {
    reload();
    reloadInReview();
  }, [reload, reloadInReview]);

  const closeAndRefresh = useCallback(() => {
    setTarget(null);
    reloadBoth();
  }, [reloadBoth]);
  const afterReplace = useCallback((body: ReplaceReviewerBody) => {
    const name = users?.find(user => user.id === body.new_reviewer_id)?.name;
    setSuccess(`Reviewer untuk ${target?.caseCode} berhasil diganti dengan ${name}.`);
    reloadBoth();
  }, [target, users, reloadBoth]);
  const replacement = useReplaceReviewer(afterReplace, closeAndRefresh);
  const { reset } = replacement;

  useEffect(() => {
    if (target || !opener.current) return;
    const returnTarget = opener.current.isConnected ? opener.current : document.getElementById(`tab-${tab}`);
    (successFeedback.current ?? errorFeedback.current ?? returnTarget)?.focus();
    opener.current = null;
  }, [target, tab]);

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
   * jadi penulisnya dicari dari versi 1. Simpan hasil per kasus selama halaman terbuka
   * dan gunakan permintaan yang sama jika dialog dibuka lagi sebelum pencarian selesai.
   */
  useEffect(() => {
    if (target === null || users === null) return;

    const { caseId } = target;
    const lookups = authorLookups.current;
    const lookup = lookups.get(caseId);
    const request: Promise<string | null> = lookup?.request ?? listCaseVersions(caseId).then(
      (versions) => {
        const authorId = users.find((item) => isCaseCreator(versions, item.id))?.id ?? null;
        lookups.set(caseId, { request, authorId });
        return authorId;
      },
      (error: unknown) => {
        lookups.delete(caseId);
        throw error;
      },
    );
    if (!lookup) lookups.set(caseId, { request });

    let cancelled = false;
    request
      .then((authorId) => {
        if (cancelled) return;
        setAuthorId(authorId);
        setCheckingAuthor(false);
        setAuthorFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthorId(null);
        setAuthorFailed(true);
        setCheckingAuthor(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target, users]);

  const openDialog = useCallback(
    (next: Target) => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      reset();
      setSuccess("");
      const cachedAuthor = authorLookups.current.get(next.caseId)?.authorId;
      setCheckingAuthor(cachedAuthor === undefined);
      setAuthorId(cachedAuthor ?? null);
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
        caseTitle: row.case_title,
        roundNo: row.round_no,
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
        caseTitle: row.case.title,
        roundNo: row.review.round_no,
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
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next: Tab = tab === "queue" ? "decisions" : "queue";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-4">
      <header>
        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Review kasus
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pantau kasus yang sedang direview dan tangani kasus yang kehilangan
          reviewer.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Tampilan pemantauan"
        className="flex gap-2 border-b border-line-soft"
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
                ? "-mb-px border-b-2 border-ink px-3 py-2 text-sm font-medium text-ink"
                : "px-3 py-2 text-sm text-muted hover:text-slate-700"
            }
          >
            {TAB_LABEL[name]}
          </button>
        ))}
      </div>

      {!target && success && (
        <output ref={successFeedback} tabIndex={-1} className={feedbackClass}>{success}</output>
      )}
      {!target && replacement.error && (
        <p ref={errorFeedback} tabIndex={-1} role="alert" className={feedbackClass}>{replacement.error}</p>
      )}

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
          caseTitle={target.caseTitle}
          roundNo={target.roundNo}
          loadingCandidates={users === null || checkingAuthor}
          currentReviewerId={target.reviewerId}
          currentReviewerName={target.reviewerName}
          candidates={candidatesExcept(users ?? [], target.takenReviewerIds, authorId)}
          notice={dialogNotice(usersFailed, authorFailed)}
          pending={replacement.pending}
          error={replacement.error}
          onConfirm={(body) =>
            replacement.replace(target.assignmentId, body)
          }
          onClose={() => { reset(); setTarget(null); }}
        />
      )}
    </div>
  );
}
