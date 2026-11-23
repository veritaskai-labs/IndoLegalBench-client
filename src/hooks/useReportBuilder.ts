"use client";

import { useState } from "react";

import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAsyncResource, type AsyncResource } from "@/hooks/useAsyncResource";
import { useReportValidation, type ReportValidationState } from "@/hooks/useReportValidation";
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
  matchesFilter,
  toggleSession,
} from "@/lib/reports/builder/builderSelection";
import {
  chooseScope,
  scopeOptions as scopeOptionsOf,
  validationView,
  type ScopeOption,
  type ValidationView,
} from "@/lib/reports/builder/validationView";
import { outcomeFromError, outcomeFromResponse, type CreateOutcome } from "@/lib/reports/builder/createOutcome";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import { stripBlank } from "@/lib/text";
import type { Role } from "@/types";
import type {
  EligibleSession,
  MeasurementFilter,
  ProductLabelMode,
  ReportCreate,
  ReportValidation,
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
  /** Live answer of POST /reports/validate for the picked sessions (SCRUM-366). */
  validation: ReportValidationState;
  view: ValidationView;
  scopeOptions: ScopeOption[];
  scoreScope: ScoreScope;
  setScoreScope: (scope: ScoreScope) => void;
  canChooseLabel: boolean;
  productLabelMode: ProductLabelMode;
  setProductLabelMode: (mode: ProductLabelMode) => void;
  title: string;
  setTitle: (title: string) => void;
  titleProblem: TitleProblem | null;
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
export function useReportBuilder(
  role: Role | null,
  gateway: ReportsGateway = httpReportsGateway,
  validateDelayMs?: number,
): ReportBuilder {
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

  // The check asks with the score type the form will actually use. When the user's own choice is not offered, the
  // form moves to one that is, and that one must be checked too: the answer for the old choice still holds its
  // violations (the server says NO_SHARED_CASES for a score type the cases do not have), so Create would stay off.
  // It settles in at most two requests: the offered scope types do not depend on the score type that was asked.
  // verdictSeen mirrors the last answer so the request can depend on it in the same render (React's "adjust state
  // while rendering" pattern); both sides are the same object after one extra render, so it cannot loop.
  const [verdictSeen, setVerdictSeen] = useState<ReportValidation | null>(null);
  const allowedScopes = allowedScoreScopes(role);
  const askedScope = chooseScope(choices.scoreScope, scopeOptionsOf(allowedScopes, verdictSeen));
  const validation = useReportValidation(
    { session_ids: kept.map((s) => s.session_id), score_scope: askedScope, measurement_filter: filter },
    gateway,
    validateDelayMs,
    sessions.status === "ready" && role !== null,
  );
  if (validation.verdict !== verdictSeen) setVerdictSeen(validation.verdict);
  const view = validationView(validation.verdict);
  const scopeOptions = scopeOptionsOf(allowedScopes, validation.verdict);
  const scoreScope = chooseScope(choices.scoreScope, scopeOptions);

  const body: ReportCreate = {
    title: stripBlank(title),
    session_ids: kept.map((s) => s.session_id),
    score_scope: scoreScope,
    measurement_filter: filter,
    product_label_mode: choices.productLabelMode,
    // Server default. Letting the user choose the report language is PBI-26, not this task.
    language: "en",
  };

  const create = () =>
    gateway.create(body).then(
      (response) => outcomeFromResponse({ report: response.report, warning: response.warning ?? null }),
      outcomeFromError,
    );
  const action = useAsyncAction(create, setOutcome, unusedCreateMessage);
  // Create waits for the answer to the latest selection. A failed check does not block: the server checks again.
  const canSubmit = titleProblem === null && validation.status !== "checking" && !view.blocking && !action.pending;

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
    validation,
    view,
    scopeOptions,
    scoreScope,
    setScoreScope: (scoreScope) => setRawChoices((c) => ({ ...c, scoreScope })),
    canChooseLabel: canChooseProductLabel(role),
    productLabelMode: choices.productLabelMode,
    setProductLabelMode: (productLabelMode) => setRawChoices((c) => ({ ...c, productLabelMode })),
    title,
    setTitle,
    titleProblem,
    canSubmit,
    submitting: action.pending,
    submit: async () => {
      if (canSubmit) await action.run();
    },
    outcome,
  };
}
