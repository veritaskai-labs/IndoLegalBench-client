import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { eligibleSession } from "@/test/reportFixtures";
import type { Role } from "@/types";
import type { EligibleSession, ReportCreateResponse } from "@/types/reports";

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

function fakeGateway(overrides: Partial<ReportsGateway> = {}): ReportsGateway {
  return {
    list: vi.fn(),
    detail: vi.fn(),
    pdf: vi.fn(),
    eligibleSessions: vi.fn().mockResolvedValue(rows),
    create: vi.fn().mockResolvedValue({ report: { id: "r-1" }, warning: null }),
    ...overrides,
  } as ReportsGateway;
}

async function readyBuilder(role: Role | null = "admin", gateway = fakeGateway()) {
  const hook = renderHook(({ r }) => useReportBuilder(r, gateway), { initialProps: { r: role } });
  await waitFor(() => expect(hook.result.current.sessions.status).toBe("ready"));
  return { ...hook, gateway };
}

function pick(result: { current: ReturnType<typeof useReportBuilder> }, ...sessions: EligibleSession[]) {
  for (const session of sessions) act(() => result.current.toggle(session));
}

describe("useReportBuilder: loading the picker (AC1, AC4)", () => {
  // Positive: one request for every session; the filter works on the page so picks never vanish unseen.
  // SCRUM-365: the field opens on the Valid tab, and the invalid ones wait on their own tab.
  it("loads every session once, eligible or not, and opens on the Valid tab", async () => {
    const { result, gateway } = await readyBuilder();

    expect(gateway.eligibleSessions).toHaveBeenCalledTimes(1);
    expect(gateway.eligibleSessions).toHaveBeenCalledWith("all");
    expect(result.current.tab).toBe("valid");
    expect(result.current.visibleSessions).toEqual([autoA, autoA2, manualB, autoC]);
    expect(result.current.tabCounts).toEqual({ valid: 4, invalid: 1 });
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

    expect(result.current.scoreScopes).toEqual(scopes);
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
    expect(result.current.selectionProblems).toEqual(["NEED_AT_LEAST_TWO_PRODUCTS"]);
    expect(result.current.canSubmit).toBe(false);

    pick(result, autoA2); // same product: replaces autoA, still one product
    expect(result.current.picked).toEqual([autoA2]);
    expect(result.current.canSubmit).toBe(false);

    pick(result, manualB);
    expect(result.current.selectionProblems).toEqual([]);
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
    expect(result.current.selectionProblems).toEqual(["NEED_AT_LEAST_TWO_PRODUCTS"]);
    expect(result.current.canSubmit).toBe(false);
  });

  // Edge (AC13 b): warn before Create when picked sessions were graded by different judges.
  it("warns when the picked sessions use different judges", async () => {
    const { result } = await readyBuilder();

    pick(result, autoA, manualB);
    expect(result.current.judgeWarning).toBe(false);

    pick(result, autoC);
    expect(result.current.judgeWarning).toBe(true);
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
    return builder;
  }

  it("sends one POST with the kept sessions and the chosen options", async () => {
    const { result, gateway } = await readyToCreate();
    act(() => result.current.setScoreScope("dev"));
    act(() => result.current.setProductLabelMode("code"));

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
    await act(async () => result.current.submit());

    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ session_ids: ["a-1", "c-1"], measurement_filter: "automatic" }),
    );
  });

  // Edge (AC13 b): a dropped session does not take part, so its judge must not raise the warning.
  it("ignores the judge of a session the filter drops", async () => {
    const { result } = await readyBuilder();
    pick(result, manualB, autoC); // judge-1 and judge-2

    act(() => result.current.setFilter("manual"));

    expect(result.current.judgeWarning).toBe(false);
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

// SCRUM-365 (PBI-15 AC1, AC4, AC5): search bar, Valid / Tidak valid tabs and a product filter on the session
// field. The rules are tested in sessionSearch.test.ts; these tests check the hook keeps them as state and that
// they only change what is shown, never what is picked.
describe("useReportBuilder: search, tabs and product filter (SCRUM-365)", () => {
  it("Positif: the Tidak valid tab shows the invalid sessions with their reasons", async () => {
    const { result } = await readyBuilder();

    act(() => result.current.setTab("invalid"));

    expect(result.current.visibleSessions).toEqual([cancelled]);
    expect(result.current.visibleSessions[0].reasons).toEqual([{ code: "SESSION_CANCELLED", message: "Sesi dibatalkan." }]);
  });

  it("Positif: narrows the field by search text and by more than one product", async () => {
    const { result } = await readyBuilder();

    act(() => result.current.setQuery("C-1"));
    expect(result.current.visibleSessions).toEqual([autoC]);

    act(() => result.current.setQuery(""));
    act(() => result.current.toggleProduct("p-a"));
    act(() => result.current.toggleProduct("p-b"));
    expect(result.current.productIds).toEqual(["p-a", "p-b"]);
    expect(result.current.visibleSessions).toEqual([autoA, autoA2, manualB]);

    // Choosing a product again takes it back out of the filter.
    act(() => result.current.toggleProduct("p-a"));
    expect(result.current.visibleSessions).toEqual([manualB]);
  });

  it("Positif: offers every product once in the dropdown, valid or not", async () => {
    const { result } = await readyBuilder();
    expect(result.current.productOptions.map((option) => option.id).sort()).toEqual(["p-a", "p-b", "p-c", "p-x"]);
  });

  // The subtask asks that picks survive switching tab or filter: a picked session hidden by the search is
  // still in the report, so the user does not have to pick it again.
  it("Positif: keeps the picked sessions while the tab, the search and the products change", async () => {
    const { result } = await readyBuilder();
    act(() => result.current.setTitle("Perbandingan"));
    pick(result, autoA, manualB);

    act(() => result.current.setQuery("tidak ada yang cocok"));
    act(() => result.current.setTab("invalid"));
    act(() => result.current.toggleProduct("p-x"));

    expect(result.current.visibleSessions).toEqual([]);
    expect(result.current.picked).toEqual([autoA, manualB]);
    expect(result.current.dropped).toEqual([]);
    expect(result.current.canSubmit).toBe(true);
  });

  it("Positif: Hapus pencarian empties the search and the products but keeps the tab and the filter", async () => {
    const { result } = await readyBuilder();
    act(() => result.current.setFilter("automatic"));
    act(() => result.current.setTab("invalid"));
    act(() => result.current.setQuery("x"));
    act(() => result.current.toggleProduct("p-x"));

    act(() => result.current.clearSearch());

    expect(result.current.query).toBe("");
    expect(result.current.productIds).toEqual([]);
    expect(result.current.tab).toBe("invalid");
    expect(result.current.filter).toBe("automatic");
  });

  // Edge: the tab counts follow the search, so an empty tab can say the other tab has the hit.
  it("Edge: counts each tab after the search", async () => {
    const { result } = await readyBuilder();

    act(() => result.current.setQuery("x-1"));

    expect(result.current.visibleSessions).toEqual([]);
    expect(result.current.tabCounts).toEqual({ valid: 0, invalid: 1 });
  });
});
