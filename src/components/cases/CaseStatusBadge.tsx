"use client";

import { CASE_STATUS_STYLE, caseStatusLabel } from "@/lib/cases/caseStatus";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { CaseStatus } from "@/types/case";

export function CaseStatusBadge({ status }: Readonly<{ status: CaseStatus }>) {
  const locale = useLocale();
  return (
    <span
      className={`rounded border px-2 py-0.5 text-xs font-medium ${CASE_STATUS_STYLE[status]}`}
    >
      {caseStatusLabel(status, locale)}
    </span>
  );
}