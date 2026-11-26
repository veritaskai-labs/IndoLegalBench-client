"use client";

import { useMemo } from "react";
import { Badge, Button, DataTable, type Column } from "@/components/ui";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import {
  ASSIGNMENT_STATUS_LABEL,
  ROUND_DECISION_LABEL,
  ROUND_STATUS_LABEL,
  newVersionLabel,
  verdictLabel,
} from "@/lib/reviews/reviewLabels";
import type { ReviewerSlot } from "@/types/reviewAdmin";

import styles from "./ReviewTables.module.css";

type Props = {
  rows: InReviewRow[];
  onReplace?: (slot: ReviewerSlot, row: InReviewRow) => void;
};

function inReviewColumns(onReplace: Props["onReplace"]): Column<InReviewRow>[] {
  return [
    {
      key: "code", header: "Kode", sortable: true, sortValue: row => row.case.case_code,
      cell: row => <code>{row.case.case_code}</code>,
    },
    {
      key: "title", header: "Judul", sortable: true, sortValue: row => row.case.title,
      cell: row => (
        <>
          {row.case.title}
          {row.newVersion !== null && <small className="block text-xs text-muted">{newVersionLabel(row.newVersion)}</small>}
        </>
      ),
    },
    {
      key: "round", header: "Ronde", sortable: true, sortValue: row => row.review.round_no,
      cell: row => `Ronde ${row.review.round_no}`,
    },
    { key: "status", header: "Status ronde", cell: row => <Badge dot>{ROUND_STATUS_LABEL[row.review.status]}</Badge> },
    {
      key: "decision", header: "Keputusan",
      cell: row => (
        <span className={row.review.decision ? "text-ink" : "text-muted"}>
          <span className={styles.roundLabel}>Keputusan ronde · </span>
          {row.review.decision ? ROUND_DECISION_LABEL[row.review.decision] : "Belum diputuskan"}
        </span>
      ),
    },
    {
      key: "reviewers", header: "Reviewer dan penilaian",
      cell: row => <ReviewerCell row={row} onReplace={onReplace} />,
    },
  ];
}

export function InReviewTable({ rows, onReplace }: Readonly<Props>) {
  const columns = useMemo(() => inReviewColumns(onReplace), [onReplace]);
  return (
    <div className={`${styles.monitor} ${styles.inReview}`}>
      <DataTable caption="Kasus dalam review" columns={columns} rows={rows} rowKey={row => row.case.id} />
    </div>
  );
}

function ReviewerCell({ row, onReplace }: Readonly<{ row: InReviewRow; onReplace?: Props["onReplace"] }>) {
  if (row.review.reviewers.length === 0) return <span className="text-muted">Belum ada reviewer</span>;

  return (
    <ul className={styles.people}>
      {row.review.reviewers.map(slot => (
        <li key={slot.assignment_id}>
          <div>
            <span className="font-semibold">{slot.reviewer.name}</span>{" "}
            <span className="text-xs text-muted">· {ASSIGNMENT_STATUS_LABEL[slot.status]}</span>
            <div className="text-xs text-muted">{verdictLabel(slot.verdict)}</div>
          </div>
          {onReplace && slot.status === "active" && (
            <Button variant="ghost" size="sm"
              aria-label={`Ganti ${slot.reviewer.name}, reviewer untuk ${row.case.case_code}`}
              onClick={() => onReplace(slot, row)}>
              Ganti
            </Button>
          )}
          {slot.verdict?.comment && (
            <details className="col-span-full text-xs text-muted">
              <summary className="w-fit cursor-pointer" aria-label={`Lihat komentar ${slot.reviewer.name}`}>
                Lihat komentar
              </summary>
              <p className="my-1 whitespace-pre-wrap">{slot.verdict.comment}</p>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}
