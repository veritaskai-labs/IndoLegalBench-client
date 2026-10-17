import { CASE_STATUS_LABEL, CASE_STATUS_STYLE } from "@/lib/cases/caseStatus";
import type { CaseStatus } from "@/types/case";

export function CaseStatusBadge({ status }: Readonly<{ status: CaseStatus }>) {
  return (
    <span
      className={`rounded border px-2 py-0.5 text-xs font-medium ${CASE_STATUS_STYLE[status]}`}
    >
      {CASE_STATUS_LABEL[status]}
    </span>
  );
}