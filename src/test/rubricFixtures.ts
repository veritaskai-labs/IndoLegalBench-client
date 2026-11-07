import { vi } from "vitest";

import type { RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { GradingRun, RubricVersion, RubricVersionSummary } from "@/types/rubric";

export function makeRubricVersion(overrides: Partial<RubricVersion> = {}): RubricVersion {
  return {
    id: "v-1",
    version_no: 1,
    effective_date: "2026-10-27",
    is_active: true,
    locked_at: "2026-10-27T03:00:00Z",
    judge_prompt_quality: "Nilai kualitas jawaban.",
    judge_prompt_format: "Nilai format jawaban.",
    approved_by_name: "Steven & Deanne",
    approved_at: "2026-10-27",
    created_by_name: "Aileen",
    created_at: "2026-10-27T03:00:00Z",
    aspects: [],
    levels: [],
    ...overrides,
  };
}

/** Satu baris GET /admin/rubrics seperti dikirim server (bentuk generate, bukan draf tulis tangan). */
export function makeRubricSummary(overrides: Partial<RubricVersionSummary> = {}): RubricVersionSummary {
  return {
    id: "v-1",
    version_no: 1,
    effective_date: "2026-10-27",
    is_active: true,
    created_by: "u-1",
    created_by_name: "Aileen",
    created_at: "2026-10-27T03:00:00Z",
    approved_by_name: "Steven & Deanne",
    approved_at: "2026-10-27",
    aspect_count: 3,
    level_count: 6,
    ...overrides,
  };
}

export function makeGradingRun(overrides: Partial<GradingRun> = {}): GradingRun {
  return {
    id: "r-1",
    kind: "initial",
    status: "finished",
    rubric_version_id: "v-1",
    rubric_version_no: 1,
    triggered_by_name: "Aileen",
    triggered_at: "2026-11-06T03:05:00Z",
    is_latest: true,
    ...overrides,
  };
}

/** Gateway palsu: hook dan komponen diuji tanpa jaringan. Panggilan yang tidak diatur menolak, bukan diam. */
export function makeFakeGateway(overrides: Partial<RubricsGateway> = {}): RubricsGateway {
  const unset = (name: string) => vi.fn().mockRejectedValue(new Error(`${name} tidak diatur`));
  return {
    listVersions: unset("listVersions"),
    createVersion: unset("createVersion"),
    regrade: unset("regrade"),
    listGradingRuns: unset("listGradingRuns"),
    ...overrides,
  };
}
