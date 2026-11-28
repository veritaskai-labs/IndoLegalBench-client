"use client";

import { useMemo, useRef, useState } from "react";
import { Badge, Button, DataTable, type Column } from "@/components/ui";
import { fill, messages, type Locale } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { roundStatusLabel } from "@/lib/reviews/reviewLabels";
import { reassignmentReason, reviewerName, voidReason } from "@/lib/reviews/reviewQueue";
import type { ReassignmentAssignment, ReassignmentRow } from "@/types/reviewAdmin";
import styles from "./ReviewTables.module.css";

const COPY = messages({
  id: {
    code: "Kode",
    title: "Judul",
    round: "Ronde",
    roundNo: "Ronde {round}",
    roundStatus: "Status ronde",
    reason: "Alasan",
    affected: "{count} penugasan terdampak",
    replace: "Ganti reviewer",
    replaceName: "Ganti {name}",
    replaceFor: "{label}, reviewer untuk {code}",
    none: "Tidak ada penugasan untuk diganti",
  },
  en: {
    code: "Code",
    title: "Title",
    round: "Round",
    roundNo: "Round {round}",
    roundStatus: "Round status",
    reason: "Reason",
    affected: "{count} assignments affected",
    replace: "Replace reviewer",
    replaceName: "Replace {name}",
    replaceFor: "{label}, reviewer for {code}",
    none: "No assignment to replace",
  },
});

type Copy = (typeof COPY)["id"];

type Props = {
  rows: ReassignmentRow[];
  onReplace: (assignment: ReassignmentAssignment, row: ReassignmentRow) => void;
};

function ReplaceAction({ item, row, onReplace }: Readonly<{
  item: ReassignmentAssignment;
  row: ReassignmentRow;
  onReplace: Props["onReplace"];
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const text = useRef<HTMLSpanElement>(null);
  const [reveal, setReveal] = useState(false);
  const multiple = row.void_assignments.length > 1;
  const label = fill(copy.replaceName, { name: reviewerName(item, locale) });
  function showOverflow() {
    const node = text.current;
    setReveal(!!node && node.scrollWidth > node.clientWidth);
  }

  return (
    <li className="relative w-fit max-w-full" onMouseLeave={() => setReveal(false)}>
      {multiple && <span className="mb-1 block text-xs text-warning-ink">{voidReason(item, locale)}</span>}
      <Button variant="ghost" size="sm" aria-label={fill(copy.replaceFor, { label, code: row.case_code })}
        onClick={() => onReplace(item, row)} onFocus={showOverflow} onMouseEnter={showOverflow}
        onBlur={() => setReveal(false)} onKeyDown={(event) => { if (event.key === "Escape") setReveal(false); }}
        className={multiple ? "h-auto! min-h-8 max-w-48 whitespace-normal! py-1 text-left" : "max-w-48"}>
        <span ref={text} className={multiple ? "wrap-anywhere" : "truncate"}>{label}</span>
      </Button>
      {reveal && <span aria-hidden="true" className="absolute right-0 bottom-full z-10 mb-0.5 w-max max-w-52 wrap-anywhere rounded-tag bg-ink px-2 py-1 text-xs text-paper">{label}</span>}
    </li>
  );
}

function reassignmentColumns(onReplace: Props["onReplace"], locale: Locale, copy: Copy): Column<ReassignmentRow>[] {
  return [
    { key: "case_code", header: copy.code, sortable: true, cell: row => <code>{row.case_code}</code> },
    { key: "case_title", header: copy.title, sortable: true, cell: row => row.case_title },
    { key: "round_no", header: copy.round, sortable: true, cell: row => fill(copy.roundNo, { round: row.round_no }) },
    { key: "round_status", header: copy.roundStatus, cell: row => <Badge dot>{roundStatusLabel(row.round_status, locale)}</Badge> },
    { key: "reason", header: copy.reason, cell: row => row.void_assignments.length > 1
      ? fill(copy.affected, { count: row.void_assignments.length })
      : <Badge tone="amber">{reassignmentReason(row, locale)}</Badge> },
    { key: "action", header: copy.replace, cell: row => row.void_assignments.length
      ? <ul className="space-y-2">{row.void_assignments.map(item =>
          <ReplaceAction key={item.id} item={item} row={row} onReplace={onReplace} />
        )}</ul>
      : <span className="text-muted">{copy.none}</span> },
  ];
}

export function ReassignmentTable({ rows, onReplace }: Readonly<Props>) {
  const locale = useLocale();
  const copy = useText(COPY);
  const columns = useMemo(() => reassignmentColumns(onReplace, locale, copy), [onReplace, locale, copy]);
  return <div className={`${styles.monitor} ${styles.queue}`}><DataTable columns={columns} rows={rows} rowKey={row => row.round_id} /></div>;
}
