"use client";

import { useMemo, useRef, useState } from "react";
import { Badge, Button, DataTable, type Column } from "@/components/ui";
import { ROUND_STATUS_LABEL } from "@/lib/reviews/reviewLabels";
import { reassignmentReason, reviewerName, voidReason } from "@/lib/reviews/reviewQueue";
import type { ReassignmentAssignment, ReassignmentRow } from "@/types/reviewAdmin";
import styles from "./ReviewTables.module.css";

type Props = {
  rows: ReassignmentRow[];
  onReplace: (assignment: ReassignmentAssignment, row: ReassignmentRow) => void;
};

function ReplaceAction({ item, row, onReplace }: Readonly<{
  item: ReassignmentAssignment;
  row: ReassignmentRow;
  onReplace: Props["onReplace"];
}>) {
  const text = useRef<HTMLSpanElement>(null);
  const [reveal, setReveal] = useState(false);
  const multiple = row.void_assignments.length > 1;
  const label = `Ganti ${reviewerName(item)}`;
  function showOverflow() {
    const node = text.current;
    setReveal(!!node && node.scrollWidth > node.clientWidth);
  }

  return (
    <li className="relative w-fit max-w-full" onMouseLeave={() => setReveal(false)}>
      {multiple && <span className="mb-1 block text-xs text-warning-ink">{voidReason(item)}</span>}
      <Button variant="ghost" size="sm" aria-label={`${label}, reviewer untuk ${row.case_code}`}
        onClick={() => onReplace(item, row)} onFocus={showOverflow} onMouseEnter={showOverflow}
        onBlur={() => setReveal(false)} onKeyDown={(event) => { if (event.key === "Escape") setReveal(false); }}
        className={multiple ? "h-auto! min-h-8 max-w-48 whitespace-normal! py-1 text-left" : "max-w-48"}>
        <span ref={text} className={multiple ? "wrap-anywhere" : "truncate"}>{label}</span>
      </Button>
      {reveal && <span aria-hidden="true" className="absolute right-0 bottom-full z-10 mb-0.5 w-max max-w-52 wrap-anywhere rounded-tag bg-ink px-2 py-1 text-xs text-paper">{label}</span>}
    </li>
  );
}

function reassignmentColumns(onReplace: Props["onReplace"]): Column<ReassignmentRow>[] {
  return [
    { key: "case_code", header: "Kode", sortable: true, cell: row => <code>{row.case_code}</code> },
    { key: "case_title", header: "Judul", sortable: true, cell: row => row.case_title },
    { key: "round_no", header: "Ronde", sortable: true, cell: row => `Ronde ${row.round_no}` },
    { key: "round_status", header: "Status ronde", cell: row => <Badge dot>{ROUND_STATUS_LABEL[row.round_status]}</Badge> },
    { key: "reason", header: "Alasan", cell: row => row.void_assignments.length > 1
      ? `${row.void_assignments.length} penugasan terdampak`
      : <Badge tone="amber">{reassignmentReason(row)}</Badge> },
    { key: "action", header: "Ganti reviewer", cell: row => row.void_assignments.length
      ? <ul className="space-y-2">{row.void_assignments.map(item =>
          <ReplaceAction key={item.id} item={item} row={row} onReplace={onReplace} />
        )}</ul>
      : <span className="text-muted">Tidak ada penugasan untuk diganti</span> },
  ];
}

export function ReassignmentTable({ rows, onReplace }: Readonly<Props>) {
  const columns = useMemo(() => reassignmentColumns(onReplace), [onReplace]);
  return <div className={`${styles.monitor} ${styles.queue}`}><DataTable columns={columns} rows={rows} rowKey={row => row.round_id} /></div>;
}
