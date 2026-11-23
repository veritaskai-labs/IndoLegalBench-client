import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { eligibleSession, reportValidation } from "@/test/reportFixtures";
import type { Role } from "@/types";
import type { EligibleSession, ReportCreateResponse, ReportValidateRequest, ReportValidation } from "@/types/reports";

import { useReportBuilder } from "./useReportBuilder";

// SCRUM-321: the hook holds the builder form and talks to the gateway. Rules live in lib/reports/builder
// (tested there); these tests check the hook wires them to state and to one POST /reports.

const autoA = eligibleSession({ session_id: "a-1", product_id: "p-a", session_type: "automatic" });
const autoA2 = eligibleSession({ session_id: "a-2", product_id: "p-a", session_type: "automatic" });
const manualB = eligibleSession({ session_id: "b-1", product_id: "p-b", session_type: "manual" });
const autoC = eligibleSession({
  session_id: "c-1",
  product_id: "p-c",
  session_type: "automatic",
  judge_model_version: "judge-2",
});
const cancelled = eligibleSession({
  session_id: "x-1",
  product_id: "p-x",
  eligible: false,
  reasons: [{ code: "SESSION_CANCELLED", message: "Sesi dibatalkan." }],
});
const rows = [autoA, autoA2, manualB, autoC, cancelled];

const needTwoProducts = {
  kind: "selection",
  code: "NEED_AT_LEAST_TWO_PRODUCTS",
  message: "Pilih sesi dari minimal dua produk untuk dibandingkan.",
} as const;

// A small stand-in for the server: fewer than two products is a violation and offers no score type.
function answerLikeServer(request: ReportValidateRequest): Promise<ReportValidation> {
  const products = new Set(request.session_ids.map((id) => rows.find((r) => r.session_id === id)?.product_id));
  return Promise.resolve(
    products.size < 2
      ? reportValidation({ valid: false, violations: [needTwoProducts], available_scopes: [] })
      : reportValidation(),
  );
}

function fakeGateway(overrides: Partial<ReportsGateway> = {}): ReportsGateway {
  return {
    list: vi.fn(),
    detail: vi.fn(),
    pdf: vi.fn(),
    eligibleSessions: vi.fn().mockResolvedValue(rows),
    create: vi.fn().mockResolvedValue({ report: { id: "r-1" }, warning: null }),
    validate: vi.fn(answerLikeServer),
    ...overrides,
  } as ReportsGateway;
}

async function readyBuilder(role: Role | null = "admin", gateway = fakeGateway()) {
  const hook = renderHook(({ r }) => useReportBuilder(r, gateway, 0), { initialProps: { r: role } });
  await waitFor(() => expect(hook.result.current.sessions.status).toBe("ready"));
  return { ...hook, gateway };
}

/** Wait for the answer to the latest selection (the check starts again after every change). */
async function validated(result: { current: ReturnType<typeof useReportBuilder> }) {
  await waitFor(() => expect(result.current.validation.status).not.toBe("checking"));
}

function pick(result: { current: ReturnType<typeof useReportBuilder> }, ...sessions: EligibleSession[]) {
  for (const session of sessions) act(() => result.current.toggle(session));
}

describe("useReportBuilder: loading the picker (AC1, AC4)", () => {
  // Positive: one request for every session; the filter works on the page so picks never vanish unseen.
  it("loads every session once, eligible or not, and shows them all", async () => {
    const { result, gateway } = await readyBuilder();

    expect(gateway.eligibleSessions).toHaveBeenCalledTimes(1);
    expect(gateway.eligibleSessions).toHaveBeenCalledWith("all");
    expect(result.current.visibleSessions).toEqual(rows);
  });

  // Negative: the list fails; the page needs a message and a way to try again.
  it("turns a failed list into an error message with reload", async () => {
    const gateway = fakeGateway({ eligibleSessions: vi.fn().mockRejectedValue(new ApiError(500, "X")) });
    const { result } = renderHook(() => useReportBuilder("admin", gateway));

    await waitFor(() => expect(result.current.sessions.status).toBe("error"));
    const state = result.current.sessions;
    expect(state.status === "error" && state.message.length > 0).toBe(true);

    vi.mocked(gateway.eligibleSessions).mockResolvedValue(rows);
    act(() => result.current.sessions.reload());
    await waitFor(() => expect(result.current.sessions.status).toBe("ready"));
  });
});

describe("useReportBuilder: options per role (AC9, AC14)", () => {
  it.each([
    ["admin", ["test", "dev", "dev_test"], true],
    ["developer_ai", ["test", "dev", "dev_test"], false],
    ["viewer", ["test"], false],
    ["contributor", ["test"], false],
  ] as const)("%s sees score types %j, label choice %s", async (role, scopes, canLabel) => {
    const { result } = await readyBuilder(role);

    expect(result.current.scopeOptions.map((o) => o.scope)).toEqual(scopes);
    expect(result.current.canChooseLabel).toBe(canLabel);
    expect(result.current.scoreScope).toBe("test");
    expect(result.current.productLabelMode).toBe("real_name");
  });

  // Edge: Admin picked Dev + Test and code labels, then the role becomes Viewer. Without a reset the page
  // sends a forbidden choice the user can no longer see, and gets a 403 they cannot fix.
  it("falls back to Test and real names when the role loses those options", async () => {
    const { result, rerender } = await readyBuilder("admin");
    act(() => result.current.setScoreScope("dev_test"));
    act(() => result.current.setProductLabelMode("code"));

    rerender({ r: "viewer" });

    expect(result.current.scoreScope).toBe("test");
    expect(result.current.productLabelMode).toBe("real_name");
  });
});

describe("useReportBuilder: picking and filter (AC1, AC5, AC13)", () => {
  it("needs two products before Create, counting products, not sessions", async () => {
    const { result } = await readyBuilder();
    act(() => result.current.setTitle("Perbandingan"));

    pick(result, autoA);
    await validated(result);
    expect(result.current.view.general).toEqual([needTwoProducts]);
    expect(result.current.canSubmit).toBe(false);

    pick(result, autoA2); // same product: replaces autoA, still one product
    await validated(result);
    expect(result.current.picked).toEqual([autoA2]);
    expect(result.current.canSubmit).toBe(false);

    pick(result, manualB);
    await validated(result);
    expect(result.current.view.general).toEqual([]);
    expect(result.current.canSubmit).toBe(true);
  });

  // Negative (AC4): an ineligible session cannot be picked.
  it("does not pick an ineligible session", async () => {
    const { result } = await readyBuilder();

    pick(result, cancelled);

    expect(result.current.picked).toEqual([]);
  });

  // Edge (AC5): the server drops picked sessions outside the filter without a word, so the hook names them
  // and leaves them out of the request; a filter that leaves one product blocks Create.
  it("hides other kinds and names picked sessions the filter drops", async () => {
    const { result } = await readyBuilder();
    act(() => result.current.setTitle("Perbandingan"));
    pick(result, autoA, manualB);

    act(() => result.current.setFilter("manual"));

    expect(result.current.visibleSessions).toEqual([manualB]);
    expect(result.current.dropped).toEqual([autoA]);
    await validated(result);
    expect(result.current.view.general).toEqual([needTwoProducts]);
    expect(result.current.canSubmit).toBe(false);
  });

  // Negative: a title of spaces passes `length` but the server rejects it (422).
  it.each(["", "   ", "\u200b"])("blocks Create for the blank title %j", async (title) => {
    const { result } = await readyBuilder();
    pick(result, autoA, manualB);

    act(() => result.current.setTitle(title));

    expect(result.current.titleProblem).toBe("TITLE_REQUIRED");
    expect(result.current.canSubmit).toBe(false);
  });
});

describe("useReportBuilder: Create (AC1, AC4, AC13)", () => {
  async function readyToCreate(gateway = fakeGateway(), role: Role = "admin") {
    const builder = await readyBuilder(role, gateway);
    act(() => builder.result.current.setTitle("  Perbandingan November  "));
    pick(builder.result, autoA, manualB);
    await validated(builder.result);
    return builder;
  }

  it("sends one POST with the kept sessions and the chosen options", async () => {
    const { result, gateway } = await readyToCreate();
    act(() => result.current.setScoreScope("dev"));
    act(() => result.current.setProductLabelMode("code"));
    await validated(result); // a new score type is checked again before Create

    await act(async () => result.current.submit());

    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(gateway.create).toHaveBeenCalledWith({
      title: "Perbandingan November",
      session_ids: ["a-1", "b-1"],
      score_scope: "dev",
      measurement_filter: "all",
      product_label_mode: "code",
      language: "en", // server default; choosing the report language is PBI-26
    });
    expect(result.current.outcome).toEqual({ kind: "saved", reportId: "r-1" });
  });

  // Edge (AC5): what is sent must be what the page shows as kept. Sending the dropped session too would make
  // the server drop it silently, which is exactly what the page warns about.
  it("sends only the sessions the filter keeps, with that filter", async () => {
    const { result, gateway } = await readyToCreate();
    pick(result, autoC);

    act(() => result.current.setFilter("automatic"));
    expect(result.current.picked).toEqual([autoA, autoC]);
    await validated(result);
    await act(async () => result.current.submit());

    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ session_ids: ["a-1", "c-1"], measurement_filter: "automatic" }),
    );
  });

  // Negative (AC1): 200 with no report is not a saved report; the page must not redirect.
  it("turns a 200 NO_SHARED_CASES answer into its own outcome", async () => {
    const create = vi.fn().mockResolvedValue({ report: null, warning: "NO_SHARED_CASES" });
    const { result } = await readyToCreate(fakeGateway({ create }));

    await act(async () => result.current.submit());

    expect(result.current.outcome).toEqual({ kind: "no_shared_cases" });
  });

  // Negative (AC4, AC13): a 409 becomes every reason at once, not an error string.
  it("turns a 409 into the not comparable outcome with every reason", async () => {
    const conflict = new ApiError(409, "REPORT_NOT_COMPARABLE", null, null, [], null, {
      selection_errors: [],
      ineligible: { "a-1": ["SESSION_NOT_GRADED"] },
      rejections: [{ requirement: "RUBRIC_VERSION", message: "Rubrik berbeda." }],
    });
    const { result } = await readyToCreate(fakeGateway({ create: vi.fn().mockRejectedValue(conflict) }));

    await act(async () => result.current.submit());

    expect(result.current.outcome).toEqual({
      kind: "not_comparable",
      selectionErrors: [],
      ineligible: { "a-1": ["SESSION_NOT_GRADED"] },
      rejections: [{ requirement: "RUBRIC_VERSION", message: "Rubrik berbeda." }],
    });
  });

  // Edge: no idempotency key on the server, so every extra click would save another report.
  it("sends only one request on a double click", async () => {
    let finish: (value: ReportCreateResponse) => void = () => undefined;
    const create = vi.fn(() => new Promise<ReportCreateResponse>((resolve) => (finish = resolve)));
    const { result } = await readyToCreate(fakeGateway({ create }));

    act(() => {
      void result.current.submit();
      void result.current.submit();
    });
    expect(result.current.submitting).toBe(true);
    expect(result.current.canSubmit).toBe(false); // the button is disabled, not only guarded
    await act(async () => finish({ report: { id: "r-2" }, warning: null } as ReportCreateResponse));

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.current.submitting).toBe(false);
  });

  // Negative: submit is reachable even when the button should be disabled (keyboard, tests); never send then.
  it("does not send when the form is not valid", async () => {
    const { result, gateway } = await readyBuilder();
    pick(result, autoA);
    await validated(result);

    await act(async () => result.current.submit());

    expect(gateway.create).not.toHaveBeenCalled();
  });

  // Edge: old 409 reasons must not stay next to sessions after the user changed the selection.
  it("clears the last outcome when the selection changes", async () => {
    const { result } = await readyToCreate(fakeGateway({ create: vi.fn().mockRejectedValue(new ApiError(500, "X")) }));
    await act(async () => result.current.submit());
    expect(result.current.outcome?.kind).toBe("failed");

    pick(result, autoC);

    expect(result.current.outcome).toBeNull();
  });
});

// SCRUM-366: every selection change is checked by the server (POST /reports/validate); the hook turns the answer
// into what the form shows. The rules themselves are the server's and are tested there.
describe("useReportBuilder: live validation (SCRUM-366, AC1 AC4 AC5 AC13 AC14)", () => {
  const rubricViolation = {
    kind: "requirement",
    code: "RUBRIC_VERSION",
    message: "Versi rubrik sesi terpilih berbeda.",
  } as const;
  const trialWarning = { code: "TRIAL_SESSION", message: "Sesi uji coba.", session_id: "a-1" } as const;

  async function readyToCheck(validate: ReportsGateway["validate"], role: Role = "admin") {
    const builder = await readyBuilder(role, fakeGateway({ validate }));
    act(() => builder.result.current.setTitle("Perbandingan"));
    pick(builder.result, autoA, manualB);
    await validated(builder.result);
    return builder;
  }

  it("asks the server with the kept sessions, the score type and the filter", async () => {
    const validate = vi.fn(answerLikeServer);
    const { result } = await readyToCheck(validate);

    act(() => result.current.setFilter("automatic"));
    pick(result, autoC);
    await validated(result);

    expect(validate).toHaveBeenLastCalledWith({
      session_ids: ["a-1", "c-1"],
      score_scope: "test",
      measurement_filter: "automatic",
    });
  });

  // Edge: Create must wait for the answer to the latest selection, or an old "valid" could let a new bad pick through.
  it("keeps Create off while the answer for the latest selection is on its way", async () => {
    const { result } = await readyToCheck(vi.fn(answerLikeServer));
    expect(result.current.canSubmit).toBe(true);

    pick(result, autoC);

    expect(result.current.validation.status).toBe("checking");
    expect(result.current.canSubmit).toBe(false);
    await validated(result);
    expect(result.current.canSubmit).toBe(true);
  });

  it("blocks Create while the server reports any violation and keeps them all", async () => {
    const answer = reportValidation({ valid: false, violations: [rubricViolation, needTwoProducts] });
    const { result } = await readyToCheck(vi.fn().mockResolvedValue(answer));

    expect(result.current.view.general).toEqual([rubricViolation, needTwoProducts]);
    expect(result.current.canSubmit).toBe(false);
  });

  it("shows a violation next to its session", async () => {
    const cancelledRow = { kind: "session", code: "SESSION_CANCELLED", message: "Dibatalkan.", session_id: "b-1" } as const;
    const answer = reportValidation({ valid: false, violations: [cancelledRow] });
    const { result } = await readyToCheck(vi.fn().mockResolvedValue(answer));

    expect(result.current.view.bySession.get("b-1")).toEqual([cancelledRow]);
    expect(result.current.view.general).toEqual([]);
  });

  // Edge: warnings are information, they must never switch Create off.
  it("shows warnings without blocking Create", async () => {
    const { result } = await readyToCheck(vi.fn().mockResolvedValue(reportValidation({ warnings: [trialWarning] })));

    expect(result.current.view.warnings).toEqual([trialWarning]);
    expect(result.current.canSubmit).toBe(true);
  });

  it("disables a score type the server does not offer and says why", async () => {
    const { result } = await readyToCheck(
      vi.fn().mockResolvedValue(reportValidation({ available_scopes: ["test"] })),
    );

    const dev = result.current.scopeOptions.find((o) => o.scope === "dev");
    expect(dev?.disabled).toBe(true);
    expect(dev?.reason).toMatch(/dev/);
    expect(result.current.scopeOptions.find((o) => o.scope === "test")?.disabled).toBe(false);
  });

  // AC14: the picked slice only has dev cases, so the active Test choice moves to Dev by itself and Create uses it.
  it("moves to an available score type when the chosen one is not available", async () => {
    const validate = vi.fn().mockResolvedValue(reportValidation({ available_scopes: ["dev"] }));
    const { result, gateway } = await readyToCheck(validate);

    expect(result.current.scoreScope).toBe("dev");
    await act(async () => result.current.submit());
    expect(gateway.create).toHaveBeenCalledWith(expect.objectContaining({ score_scope: "dev" }));
  });

  // Edge: the user's own choice comes back when it is available again, and the check never asks with the switched
  // value, so the automatic switch cannot start a loop of new requests.
  it("goes back to the chosen score type when it is available again and never asks with the switched one", async () => {
    const validate = vi
      .fn()
      .mockResolvedValueOnce(reportValidation({ available_scopes: ["dev"] }))
      .mockResolvedValue(reportValidation());
    const { result } = await readyToCheck(validate);
    act(() => result.current.setScoreScope("dev_test"));
    await validated(result);
    expect(result.current.scoreScope).toBe("dev_test");

    expect(validate.mock.calls.every(([req]) => req.score_scope !== "dev")).toBe(true);
  });

  // Edge: nothing is offered (empty slice), so the choice stays and the violations keep Create off.
  it("keeps the chosen score type and blocks Create when no score type is available", async () => {
    const answer = reportValidation({
      valid: false,
      violations: [{ kind: "case_slice", code: "NO_SHARED_CASES", message: "Tidak ada kasus yang sama." }],
      available_scopes: [],
    });
    const { result } = await readyToCheck(vi.fn().mockResolvedValue(answer));

    expect(result.current.scoreScope).toBe("test");
    expect(result.current.scopeOptions.every((o) => o.disabled)).toBe(true);
    expect(result.current.canSubmit).toBe(false);
  });

  // Negative: if the check itself fails the server still checks again on Create, so the user is not stuck.
  it("leaves Create on and reports the failure when the check fails", async () => {
    const validate = vi.fn().mockRejectedValue(new ApiError(500, "X"));
    const { result } = await readyToCheck(validate);

    expect(result.current.validation.status).toBe("error");
    expect(result.current.validation.message).toMatch(/Pemeriksaan/);
    expect(result.current.canSubmit).toBe(true);
  });

  it("only offers Test to a viewer and asks the server for Test", async () => {
    const validate = vi.fn(answerLikeServer);
    const { result } = await readyToCheck(validate, "viewer");

    expect(result.current.scopeOptions.map((o) => o.scope)).toEqual(["test"]);
    expect(validate).toHaveBeenLastCalledWith(expect.objectContaining({ score_scope: "test" }));
  });
});
