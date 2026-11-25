import { describe, expect, it } from "vitest";

import { reportValidation } from "@/test/reportFixtures";
import type { ReportViolation, ReportWarning } from "@/types/reports";

import {
  SCOPE_UNAVAILABLE,
  SCOPE_WAITING,
  chooseScope,
  scopeOptions,
  validationView,
  type ScopeOption,
} from "./validationView";

const ALL = ["test", "dev", "dev_test"] as const;

const selectionViolation: ReportViolation = {
  kind: "selection",
  code: "NEED_AT_LEAST_TWO_PRODUCTS",
  message: "Pilih sesi dari minimal dua produk untuk dibandingkan.",
};
const requirementViolation: ReportViolation = {
  kind: "requirement",
  code: "RUBRIC_VERSION",
  message: "Versi rubrik sesi terpilih berbeda.",
};
const sessionViolation: ReportViolation = {
  kind: "session",
  code: "SESSION_CANCELLED",
  message: "Sesi ini dibatalkan.",
  session_id: "s-2",
};
const sliceViolation: ReportViolation = {
  kind: "case_slice",
  code: "NO_SHARED_CASES",
  message: "Tidak ada kasus yang sama.",
};
const warning: ReportWarning = { code: "REPETITIONS_DIFFER", message: "Jumlah percobaan berbeda." };

describe("validationView (SCRUM-366, AC1 AC4 AC13)", () => {
  it("is empty and not blocking while no answer has arrived", () => {
    const view = validationView(null);

    expect(view).toEqual({
      general: [],
      bySession: new Map(),
      warnings: [],
      sessionWarnings: new Map(),
      blocking: false,
    });
  });

  it("is not blocking for a valid answer and keeps its warnings", () => {
    const view = validationView(reportValidation({ warnings: [warning] }));

    expect(view.blocking).toBe(false);
    expect(view.warnings).toEqual([warning]);
    expect(view.general).toEqual([]);
  });

  it("splits every violation at once into general ones and ones tied to a session", () => {
    const view = validationView(
      reportValidation({
        valid: false,
        violations: [selectionViolation, requirementViolation, sessionViolation, sliceViolation],
      }),
    );

    expect(view.blocking).toBe(true);
    expect(view.general).toEqual([selectionViolation, requirementViolation, sliceViolation]);
    expect(view.bySession.get("s-2")).toEqual([sessionViolation]);
    expect(view.bySession.size).toBe(1);
  });

  it("groups several violations of one session together", () => {
    const second = { ...sessionViolation, code: "SESSION_NOT_GRADED", message: "Belum dinilai." };
    const view = validationView(reportValidation({ valid: false, violations: [sessionViolation, second] }));

    expect(view.bySession.get("s-2")).toEqual([sessionViolation, second]);
  });

  // Edge: the flag and the list should agree; any violation in the list blocks, even if valid says true.
  it("blocks when the list has a violation even if valid is true", () => {
    const view = validationView(reportValidation({ valid: true, violations: [requirementViolation] }));

    expect(view.blocking).toBe(true);
  });

  // Edge: a session violation without session_id cannot be placed on a row, so it is shown as a general one.
  it("shows a session violation without a session id as a general violation", () => {
    const orphan: ReportViolation = { ...sessionViolation, session_id: null };
    const view = validationView(reportValidation({ valid: false, violations: [orphan] }));

    expect(view.general).toEqual([orphan]);
    expect(view.bySession.size).toBe(0);
  });
});

describe("validationView: warnings about one session", () => {
  const trial: ReportWarning = { code: "TRIAL_SESSION", message: "Sesi ini berjenis Uji Coba.", session_id: "s-2" };
  const range: ReportWarning = {
    code: "MANUAL_ANSWER_RANGE_OVER_LIMIT",
    message: "Rentang tanggal jawaban sesi manual ini lebih dari 7 hari.",
    session_id: "s-2",
  };

  it("puts a warning with a session id on that session, not in the general list", () => {
    const view = validationView(reportValidation({ warnings: [warning, trial] }));

    expect(view.warnings).toEqual([warning]);
    expect(view.sessionWarnings.get("s-2")).toEqual([trial]);
  });

  it("groups several warnings of one session together", () => {
    const view = validationView(reportValidation({ warnings: [trial, range] }));

    expect(view.sessionWarnings.get("s-2")).toEqual([trial, range]);
    expect(view.warnings).toEqual([]);
  });

  it("never blocks because of a session warning", () => {
    expect(validationView(reportValidation({ warnings: [trial] })).blocking).toBe(false);
  });
});

describe("scopeOptions (SCRUM-366, AC14)", () => {
  it("leaves every allowed scope enabled while no answer has arrived", () => {
    const options = scopeOptions(ALL, null);

    expect(options).toEqual(ALL.map((scope) => ({ scope, disabled: false, reason: null })));
  });

  it("disables a scope the server does not offer and says why", () => {
    const options = scopeOptions(ALL, reportValidation({ available_scopes: ["dev"] }));

    expect(options).toEqual([
      { scope: "test", disabled: true, reason: SCOPE_UNAVAILABLE.test },
      { scope: "dev", disabled: false, reason: null },
      { scope: "dev_test", disabled: true, reason: SCOPE_UNAVAILABLE.dev_test },
    ]);
    expect(SCOPE_UNAVAILABLE.test).toMatch(/test/);
  });

  // Role limit: a viewer is only offered Test, so Dev never shows up even though the server answers.
  it("only lists the scopes the role may see", () => {
    const options = scopeOptions(["test"], reportValidation({ available_scopes: ["test", "dev"] }));

    expect(options).toEqual([{ scope: "test", disabled: false, reason: null }]);
  });

  it("disables every scope with the empty-slice reason when the slice has no shared cases", () => {
    const options = scopeOptions(
      ALL,
      reportValidation({ valid: false, violations: [sliceViolation], available_scopes: [] }),
    );

    expect(options.every((o) => o.disabled)).toBe(true);
    expect(options.map((o) => o.reason)).toEqual(ALL.map((scope) => SCOPE_UNAVAILABLE[scope]));
  });

  // Edge: nothing offered because too few sessions are picked yet, which is not an empty slice.
  it("asks to pick sessions first when nothing is offered and the slice is not the problem", () => {
    const options = scopeOptions(
      ALL,
      reportValidation({ valid: false, violations: [selectionViolation], available_scopes: [] }),
    );

    expect(options.every((o) => o.disabled && o.reason === SCOPE_WAITING)).toBe(true);
    expect(SCOPE_WAITING).not.toBe("");
  });
});

describe("chooseScope (SCRUM-366: switch to an available option automatically)", () => {
  const enabled = (scope: ScopeOption["scope"]): ScopeOption => ({ scope, disabled: false, reason: null });
  const disabled = (scope: ScopeOption["scope"]): ScopeOption => ({ scope, disabled: true, reason: "x" });

  it("keeps the current scope while it is still available", () => {
    expect(chooseScope("dev", [enabled("test"), enabled("dev")])).toBe("dev");
  });

  it("moves to the first available scope when the current one is no longer available", () => {
    expect(chooseScope("test", [disabled("test"), enabled("dev"), enabled("dev_test")])).toBe("dev");
  });

  // Edge: nothing to move to, so the choice stays and the submit button stays off through the violations.
  it("keeps the current scope when no scope is available", () => {
    expect(chooseScope("test", [disabled("test"), disabled("dev")])).toBe("test");
  });

  it("keeps the current scope when the current one is not in the list at all", () => {
    expect(chooseScope("dev", [enabled("test")])).toBe("test");
  });
});
