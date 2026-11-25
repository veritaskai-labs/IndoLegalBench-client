"use client";

import { Badge, Button, DataTable, type Column } from "@/components/ui";
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

/** AC3 dan AC7. Hanya menggambar; keputusan reviewer ditampilkan apa adanya karena Admin boleh melihat semua. */
export function InReviewTable({ rows, onReplace }: Readonly<Props>) {
  const columns: Column<InReviewRow>[] = [
    { key: "code", header: "Kode", sortable: true, sortValue: row => row.case.case_code, cell: row => <code>{row.case.case_code}</code> },
    { key: "title", header: "Judul", sortable: true, sortValue: row => row.case.title, cell: row => (
      <>{row.case.title}{row.newVersion !== null && <p className="mt-1 text-xs text-accent-ink">{newVersionLabel(row.newVersion)}</p>}</>
    ) },
    { key: "round", header: "Ronde", sortable: true, sortValue: row => row.review.round_no, cell: row => `Ronde ${row.review.round_no}` },
    { key: "status", header: "Status ronde", cell: row => <Badge dot>{ROUND_STATUS_LABEL[row.review.status]}</Badge> },
    { key: "decision", header: "Keputusan", cell: row => row.review.decision ? ROUND_DECISION_LABEL[row.review.decision] : "Belum diputuskan" },
    { key: "reviewers", header: "Reviewer dan penilaian", cell: row => (
      <ReviewerCell review={row.review} onReplace={onReplace && (slot => onReplace(slot, row))} />
    ) },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={row => row.case.id} />;
}

function ReviewerCell({
  review,
  onReplace,
}: Readonly<{
  review: CaseReview;
  onReplace?: (slot: ReviewerSlot) => void;
}>) {
  if (review.reviewers.length === 0) {
    return <span className="text-muted">Belum ada reviewer</span>;
  }

  return (
    <ul className="space-y-2">
      {review.reviewers.map((slot) => (
        <li key={slot.assignment_id}>
          <span className="text-ink">{slot.reviewer.name}</span>{" "}
          <span className="text-xs text-muted">
            {ASSIGNMENT_STATUS_LABEL[slot.status]}
          </span>
          <div className="text-xs text-ink-soft">
            {verdictLabel(slot.verdict)}
          </div>
          {slot.verdict?.comment ? (
            <p className="mt-1 text-xs text-ink-soft">{slot.verdict.comment}</p>
          ) : null}
          {/* AC7: hanya penugasan aktif yang bisa diganti; yang replaced atau void sudah selesai. */}
          {onReplace && slot.status === "active" ? (
            <Button size="sm" variant="ghost"
              type="button"
              aria-label={`Ganti reviewer ${slot.reviewer.name}`}
              onClick={() => onReplace(slot)}
              className="mt-1"
            >
              Ganti reviewer
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
