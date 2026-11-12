import { describe, expect, it } from "vitest";

import { gradeEstimate } from "@/test/gradingFixtures";
import type { JudgeProviderOption } from "@/types/provider";
import { BUDGET_SHORT_TEXT, canStartGrading, NO_ATTEMPTS_TEXT, toEstimateView } from "./gradeEstimate";

// Intl puts a no-break space after "Rp"; the screen shows it as a normal space.
function plain(text: string): string {
  return text.replaceAll(" ", " ");
}

function judge(overrides: Partial<JudgeProviderOption> = {}): JudgeProviderOption {
  return { id: "judge-a", name: "Judge Alfa", provider_type: "openai_compatible", model_name: "model-a", ...overrides };
}

function valueOf(view: ReturnType<typeof toEstimateView>, label: string): string {
  const row = view.rows.find((item) => item.label === label);
  return plain(row?.value ?? "<missing row>");
}

describe("toEstimateView (PBI-14 AC6)", () => {
  it("lists attempts, rubric version, judge, cost and remaining budget in that order", () => {
    const view = toEstimateView(gradeEstimate(), [judge()]);

    expect(view.rows.map((row) => row.label)).toEqual([
      "Jumlah percobaan",
      "Versi rubrik",
      "LLM judge",
      "Perkiraan biaya",
      "Sisa anggaran judge",
    ]);
    expect(view.rows.map((row) => plain(row.value))).toEqual(["12", "Versi 1", "Judge Alfa", "Rp 15.251", "Rp 500.000"]);
  });

  it("names the judge by looking up the id the server answered with", () => {
    const options = [judge({ id: "judge-x", name: "Judge X" }), judge({ id: "judge-b", name: "Judge Beta" })];

    const view = toEstimateView(gradeEstimate({ judge_provider_id: "judge-b" }), options);

    expect(valueOf(view, "LLM judge")).toBe("Judge Beta");
  });

  // The estimate is still useful when the judge list failed to load or no longer has the judge.
  it.each([
    ["an empty judge list", []],
    ["a list without that judge", [judge({ id: "other" })]],
  ])("falls back to a generic judge label for %s", (_name, options) => {
    const view = toEstimateView(gradeEstimate(), options);

    expect(valueOf(view, "LLM judge")).toBe("Judge yang dipilih");
  });

  it("shows the remaining budget rounded down, never above the real amount", () => {
    const view = toEstimateView(gradeEstimate({ remaining_budget_idr: "500000.99" }), [judge()]);

    expect(valueOf(view, "Sisa anggaran judge")).toBe("Rp 500.000");
  });

  it("keeps a remaining budget above 2^53 exact", () => {
    const view = toEstimateView(gradeEstimate({ remaining_budget_idr: "9007199254740993.00" }), [judge()]);

    expect(valueOf(view, "Sisa anggaran judge")).toBe("Rp 9.007.199.254.740.993");
  });

  // Zero is a valid price (a free judge), not a missing value.
  it("shows a zero cost as Rp 0", () => {
    const view = toEstimateView(gradeEstimate({ estimated_cost_idr: "0.00" }), [judge()]);

    expect(valueOf(view, "Perkiraan biaya")).toBe("Rp 0");
  });

  it("shows a version label that is not v<number> as the server sent it", () => {
    const view = toEstimateView(gradeEstimate({ rubric_version: "draft" }), [judge()]);

    expect(valueOf(view, "Versi rubrik")).toBe("draft");
  });

  it("passes budget_sufficient through instead of comparing the amounts again", () => {
    const view = toEstimateView(
      gradeEstimate({ estimated_cost_idr: "1.00", remaining_budget_idr: "999999.00", budget_sufficient: false }),
      [judge()],
    );

    expect(view.budgetSufficient).toBe(false);
  });

  it.each([
    [0, false],
    [1, true],
  ])("reports hasAttempts for %i attempts to grade", (attempts, expected) => {
    const view = toEstimateView(gradeEstimate({ attempts_to_grade: attempts }), [judge()]);

    expect(view.hasAttempts).toBe(expected);
  });
});

describe("canStartGrading (PBI-14 AC6)", () => {
  const sufficient = toEstimateView(gradeEstimate(), [judge()]);
  const short = toEstimateView(gradeEstimate({ budget_sufficient: false }), [judge()]);

  it("allows starting once the estimate is ready and the budget is enough", () => {
    expect(canStartGrading({ status: "ready", data: sufficient })).toBe(true);
  });

  it("blocks starting when the budget is not enough", () => {
    expect(canStartGrading({ status: "ready", data: short })).toBe(false);
  });

  it.each([
    ["still loading", { status: "loading" } as const],
    ["failed to load", { status: "error", message: "Gagal" } as const],
    ["not requested yet", { status: "ready", data: null } as const],
  ])("blocks starting while the estimate is %s", (_name, resource) => {
    expect(canStartGrading(resource)).toBe(false);
  });

  // Nothing to grade costs nothing, so the server decides what happens next.
  it("allows starting when there are no attempts to grade", () => {
    const empty = toEstimateView(gradeEstimate({ attempts_to_grade: 0, estimated_cost_idr: "0.00" }), [judge()]);

    expect(canStartGrading({ status: "ready", data: empty })).toBe(true);
  });
});

describe("estimate texts", () => {
  it("tells the Admin what a short budget means for the start button", () => {
    expect(BUDGET_SHORT_TEXT).toBe(
      "Perkiraan biaya melebihi sisa anggaran penilai. Penilaian belum bisa dimulai. Tambah anggaran judge di halaman Provider atau pilih judge lain.",
    );
  });

  it("explains an estimate with no attempts to grade", () => {
    expect(NO_ATTEMPTS_TEXT).toBe("Tidak ada percobaan yang perlu dikirim ke judge, jadi penilaian ini tidak memakai anggaran.");
  });
});
