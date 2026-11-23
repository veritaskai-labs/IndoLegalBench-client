"use client";

import { useState } from "react";

import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncResource, type AsyncResource } from "@/hooks/useAsyncResource";
import {
  allowedScoreScopes,
  canChooseProductLabel,
  normalizeChoices,
  titleProblem as titleProblemOf,
  type BuilderChoices,
  type TitleProblem,
} from "@/lib/reports/builder/builderRules";
import {
  applyFilter,
  judgeDiffers,
  matchesFilter,
  selectionProblems as selectionProblemsOf,
  toggleSession,
  type SelectionProblem,
} from "@/lib/reports/builder/builderSelection";
import { outcomeFromError, outcomeFromResponse, type CreateOutcome } from "@/lib/reports/builder/createOutcome";
import { REPORT_LANGUAGE } from "@/lib/reports/reportLabels";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import { stripBlank } from "@/lib/text";
import type { Role } from "@/types";
import type {
  EligibleSession,
  MeasurementFilter,
  ProductLabelMode,
  ReportCreate,
  ScoreScope,
} from "@/types/reports";

export interface ReportBuilder {
  /** Every session the user may see, eligible or not, with the server's reasons (AC4). */
  sessions: AsyncResource<EligibleSession[]> & { reload: () => void };
  /** Sessions of the kind the filter shows (AC5). */
  visibleSessions: EligibleSession[];
  /** Picked sessions that go into the report (the filter keeps them). */
  picked: EligibleSession[];
  /** Picked sessions the filter leaves out; the server would drop them without a word. */
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
  /** Picked sessions were graded by different judges (AC13 b): warn, the server decides. */
  judgeWarning: boolean;
  canSubmit: boolean;
  submitting: boolean;
  submit: () => Promise<void>;
  /** Answer of the last Create, null before the first one and after the selection changes. */
  outcome: CreateOutcome | null;
}

const LIST_ERROR = "Gagal memuat daftar sesi. Coba lagi.";

const listErrorMessage = () => LIST_ERROR;
// Create never rejects: outcomeFromError turns every failure into an outcome the page can show.
const unusedCreateMessage = () => "";

/**
 * Form state of the report builder (SCRUM-321). The rules live in lib/reports/builder; this hook only keeps
 * state and calls the gateway. The list is loaded once with every kind of session and filtered here, so a
 * filter change never hides a picked session without saying so. Role-dependent options are derived on every
 * render (normalizeChoices), so a role change can never leave a forbidden choice in the request.
 */
export function useReportBuilder(role: Role | null, gateway: ReportsGateway = httpReportsGateway): ReportBuilder {
  const sessions = useAsyncResource<EligibleSession[]>(
    "report-builder-sessions",
    () => gateway.eligibleSessions("all"),
    listErrorMessage,
  );
  const [filter, setFilter] = useState<MeasurementFilter>("all");
  const [allPicked, setAllPicked] = useState<EligibleSession[]>([]);
  const [rawChoices, setRawChoices] = useState<BuilderChoices>({ scoreScope: "test", productLabelMode: "real_name" });
  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState<CreateOutcome | null>(null);

  const choices = normalizeChoices(role, rawChoices);
  const { kept, dropped } = applyFilter(allPicked, filter);
  const visibleSessions = sessions.status === "ready" ? sessions.data.filter((s) => matchesFilter(s, filter)) : [];
  const titleProblem = titleProblemOf(title);
  const selectionProblems = selectionProblemsOf(kept);

  const body: ReportCreate = {
    title: stripBlank(title),
    session_ids: kept.map((s) => s.session_id),
    score_scope: choices.scoreScope,
    measurement_filter: filter,
    product_label_mode: choices.productLabelMode,
    // Server default, and the language the web report body uses. Letting the user choose it is PBI-26.
    language: REPORT_LANGUAGE,
  };

  const create = () =>
    gateway.create(body).then(
      (response) => outcomeFromResponse({ report: response.report, warning: response.warning ?? null }),
      outcomeFromError,
    );
  const action = useAsyncAction(create, setOutcome, unusedCreateMessage);
  const canSubmit = titleProblem === null && selectionProblems.length === 0 && !action.pending;

  const toggle = (session: EligibleSession) => {
    setAllPicked((current) => toggleSession(current, session));
    setOutcome(null);
  };

  return {
    sessions,
    visibleSessions,
    picked: kept,
    dropped,
    toggle,
    filter,
    setFilter,
    scoreScopes: allowedScoreScopes(role),
    scoreScope: choices.scoreScope,
    setScoreScope: (scoreScope) => setRawChoices((c) => ({ ...c, scoreScope })),
    canChooseLabel: canChooseProductLabel(role),
    productLabelMode: choices.productLabelMode,
    setProductLabelMode: (productLabelMode) => setRawChoices((c) => ({ ...c, productLabelMode })),
    title,
    setTitle,
    titleProblem,
    selectionProblems,
    judgeWarning: judgeDiffers(kept),
    canSubmit,
    submitting: action.pending,
    submit: async () => {
      if (canSubmit) await action.run();
    },
    outcome,
  };
}
