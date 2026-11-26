"use client";

import { useMemo } from "react";
import { Badge, DataTable, type Column } from "@/components/ui";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import {
  ASSIGNMENT_STATUS_LABEL,
  ROUND_DECISION_LABEL,
  ROUND_STATUS_LABEL,
  newVersionLabel,
  verdictLabel,
} from "@/lib/reviews/reviewLabels";
import type { CaseReview, ReviewerSlot } from "@/types/reviewAdmin";

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
      cell: row => row.review.decision ? ROUND_DECISION_LABEL[row.review.decision] : "Belum diputuskan",
    },
    {
      key: "reviewers", header: "Reviewer dan penilaian",
      cell: row => <ReviewerCell review={row.review} onReplace={onReplace && (slot => onReplace(slot, row))} />,
    },
  ];
}

export function InReviewTable({ rows, onReplace }: Readonly<Props>) {
  const columns = useMemo(() => inReviewColumns(onReplace), [onReplace]);
  return <DataTable caption="Kasus dalam review" columns={columns} rows={rows} rowKey={row => row.case.id} />;
}

function ReviewerCell({
  review,
  onReplace,
}: Readonly<{
  review: CaseReview;
  onReplace?: (slot: ReviewerSlot) => void;
}>) {
  if (review.reviewers.length === 0) {
    return <span className="text-slate-500">Belum ada reviewer</span>;
  }

  return (
    <ul className="space-y-2">
      {review.reviewers.map((slot) => (
        <li key={slot.assignment_id}>
          <span className="text-slate-900">{slot.reviewer.name}</span>{" "}
          <span className="text-xs text-slate-500">
            {ASSIGNMENT_STATUS_LABEL[slot.status]}
          </span>
          <div className="text-xs text-slate-700">
            {verdictLabel(slot.verdict)}
          </div>
          {slot.verdict?.comment ? (
            <p className="mt-1 text-xs text-slate-600">{slot.verdict.comment}</p>
          ) : null}
          {/* AC7: hanya penugasan aktif yang bisa diganti; yang replaced atau void sudah selesai. */}
          {onReplace && slot.status === "active" ? (
            <button
              type="button"
              aria-label={`Ganti reviewer ${slot.reviewer.name}`}
              onClick={() => onReplace(slot)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              Ganti reviewer
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
