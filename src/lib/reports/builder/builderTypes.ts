import type { EligibleSession } from "@/types/reports";

export type { MeasurementFilter, ProductLabelMode, ScoreScope } from "@/types/reports";

/** Bagian satu baris `GET /reports/eligible-sessions` yang dipakai aturan builder (SCRUM-321). */
export type PickableSession = Pick<
  EligibleSession,
  "session_id" | "product_id" | "eligible" | "session_type" | "judge_model_version"
>;
