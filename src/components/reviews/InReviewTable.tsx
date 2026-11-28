"use client";

import { useMemo } from "react";
import { Badge, Button, DataTable, type Column } from "@/components/ui";
import { fill, messages, type Locale } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import {
  assignmentStatusLabel,
  newVersionLabel,
  roundDecisionLabel,
  roundStatusLabel,
  verdictLabel,
} from "@/lib/reviews/reviewLabels";
import type { ReviewerSlot } from "@/types/reviewAdmin";

import styles from "./ReviewTables.module.css";

const COPY = messages({
  id: {
    caption: "Kasus dalam review",
    code: "Kode",
    title: "Judul",
    round: "Ronde",
    roundNo: "Ronde {round}",
    roundStatus: "Status ronde",
    decision: "Keputusan",
    roundDecisionPrefix: "Keputusan ronde · ",
    notDecided: "Belum diputuskan",
    reviewers: "Reviewer dan penilaian",
    noReviewer: "Belum ada reviewer",
    replace: "Ganti",
    replaceReviewer: "Ganti {name}, reviewer untuk {code}",
    viewComment: "Lihat komentar",
    viewCommentOf: "Lihat komentar {name}",
  },
  en: {
    caption: "Cases in review",
    code: "Code",
    title: "Title",
    round: "Round",
    roundNo: "Round {round}",
    roundStatus: "Round status",
    decision: "Decision",
    roundDecisionPrefix: "Round decision · ",
    notDecided: "Not yet decided",
    reviewers: "Reviewer and verdict",
    noReviewer: "No reviewer yet",
    replace: "Replace",
    replaceReviewer: "Replace {name}, reviewer for {code}",
    viewComment: "View comment",
    viewCommentOf: "View {name}'s comment",
  },
});

type Copy = (typeof COPY)["id"];

type Props = {
  rows: InReviewRow[];
  onReplace?: (slot: ReviewerSlot, row: InReviewRow) => void;
};

function inReviewColumns(onReplace: Props["onReplace"], locale: Locale, copy: Copy): Column<InReviewRow>[] {
  return [
    {
      key: "code", header: copy.code, sortable: true, sortValue: row => row.case.case_code,
      cell: row => <code>{row.case.case_code}</code>,
    },
    {
      key: "title", header: copy.title, sortable: true, sortValue: row => row.case.title,
      cell: row => (
        <>
          {row.case.title}
          {row.newVersion !== null && <small className="block text-xs text-muted">{newVersionLabel(row.newVersion, locale)}</small>}
        </>
      ),
    },
    {
      key: "round", header: copy.round, sortable: true, sortValue: row => row.review.round_no,
      cell: row => fill(copy.roundNo, { round: row.review.round_no }),
    },
    { key: "status", header: copy.roundStatus, cell: row => <Badge dot>{roundStatusLabel(row.review.status, locale)}</Badge> },
    {
      key: "decision", header: copy.decision,
      cell: row => (
        <span className={row.review.decision ? "text-ink" : "text-muted"}>
          <span className={styles.roundLabel}>{copy.roundDecisionPrefix}</span>
          {row.review.decision ? roundDecisionLabel(row.review.decision, locale) : copy.notDecided}
        </span>
      ),
    },
    {
      key: "reviewers", header: copy.reviewers,
      cell: row => <ReviewerCell row={row} onReplace={onReplace} />,
    },
  ];
}

export function InReviewTable({ rows, onReplace }: Readonly<Props>) {
  const locale = useLocale();
  const copy = useText(COPY);
  const columns = useMemo(() => inReviewColumns(onReplace, locale, copy), [onReplace, locale, copy]);
  return (
    <div className={`${styles.monitor} ${styles.inReview}`}>
      <DataTable caption={copy.caption} columns={columns} rows={rows} rowKey={row => row.case.id} />
    </div>
  );
}

function ReviewerCell({ row, onReplace }: Readonly<{ row: InReviewRow; onReplace?: Props["onReplace"] }>) {
  const locale = useLocale();
  const copy = useText(COPY);
  if (row.review.reviewers.length === 0) return <span className="text-muted">{copy.noReviewer}</span>;

  return (
    <ul className={styles.people}>
      {row.review.reviewers.map(slot => (
        <li key={slot.assignment_id}>
          <div>
            <span className="font-semibold">{slot.reviewer.name}</span>{" "}
            <span className="text-xs text-muted">· {assignmentStatusLabel(slot.status, locale)}</span>
            <div className="text-xs text-muted">{verdictLabel(slot.verdict, locale)}</div>
          </div>
          {onReplace && slot.status === "active" && (
            <Button variant="ghost" size="sm"
              aria-label={fill(copy.replaceReviewer, { name: slot.reviewer.name, code: row.case.case_code })}
              onClick={() => onReplace(slot, row)}>
              {copy.replace}
            </Button>
          )}
          {slot.verdict?.comment && (
            <details className="col-span-full text-xs text-muted">
              <summary className="w-fit cursor-pointer" aria-label={fill(copy.viewCommentOf, { name: slot.reviewer.name })}>
                {copy.viewComment}
              </summary>
              <p className="my-1 whitespace-pre-wrap">{slot.verdict.comment}</p>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}
