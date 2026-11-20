"use client";

import type { AsyncResource } from "@/hooks/useAsyncResource";
import type { TitleProblem } from "@/lib/reports/builder/builderRules";
import type { SelectionProblem } from "@/lib/reports/builder/builderSelection";
import type { CreateOutcome } from "@/lib/reports/builder/createOutcome";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { Role } from "@/types";
import type { EligibleSession, MeasurementFilter, ProductLabelMode, ScoreScope } from "@/types/reports";

export interface ReportBuilder {
  sessions: AsyncResource<EligibleSession[]> & { reload: () => void };
  visibleSessions: EligibleSession[];
  picked: EligibleSession[];
  dropped: EligibleSession[];
  toggle: (session: EligibleSession) => void;
  filter: MeasurementFilter;
  setFilter: (filter: MeasurementFilter) => void;
  scoreScopes: readonly ScoreScope[];
  scoreScope: ScoreScope;
  setScoreScope: (scope: ScoreScope) => void;
  canChooseLabel: boolean;
  productLabelMode: ProductLabelMode;
  setProductLabelMode: (mode: ProductLabelMode) => void;
  title: string;
  setTitle: (title: string) => void;
  titleProblem: TitleProblem | null;
  selectionProblems: SelectionProblem[];
  judgeWarning: boolean;
  canSubmit: boolean;
  submitting: boolean;
  submit: () => Promise<void>;
  outcome: CreateOutcome | null;
}

// Red skeleton (SCRUM-321 cycle 11): real signature, no behaviour.
export function useReportBuilder(role: Role | null, gateway: ReportsGateway = httpReportsGateway): ReportBuilder {
  void role;
  void gateway;
  const noop = () => undefined;
  return {
    sessions: { status: "loading", reload: noop },
    visibleSessions: [],
    picked: [],
    dropped: [],
    toggle: noop,
    filter: "all",
    setFilter: noop,
    scoreScopes: [],
    scoreScope: "test",
    setScoreScope: noop,
    canChooseLabel: false,
    productLabelMode: "real_name",
    setProductLabelMode: noop,
    title: "",
    setTitle: noop,
    titleProblem: "TITLE_REQUIRED",
    selectionProblems: [],
    judgeWarning: false,
    canSubmit: false,
    submitting: false,
    submit: async () => undefined,
    outcome: null,
  };
}
