import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import type { CaseStatus } from "@/types/case";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
      {CASE_STATUS_LABEL[status]}
    </span>
  );
}
