import { describe, expect, it } from "vitest";

import { gradeEstimate } from "@/test/gradingFixtures";
import { BUDGET_SHORT_TEXT, canStartGrading, NO_ATTEMPTS_TEXT, toEstimateView } from "./gradeEstimate";

// Intl puts a no-break space after "Rp"; the screen shows it as a normal space.
function plain(text: string): string {
  return text.replaceAll(" ", " ");
}

function valueOf(view: ReturnType<typeof toEstimateView>, label: string): string {
  const row = view.rows.find((item) => item.label === label);
  return plain(row?.value ?? "<missing row>");
}

describe("toEstimateView (PBI-14 AC6, SCRUM-375 C1)", () => {
  // Positive (C1): rubric version first, then attempts, cost and the remaining budget; the judge is in the picker above.
  it("lists rubric version, attempts, cost and remaining budget in that order", () => {
    const view = toEstimateView(gradeEstimate());

    expect(view.rows.map((row) => row.label)).toEqual([
      "Versi rubrik",
      "Jumlah percobaan",
      "Perkiraan biaya",
      "Sisa anggaran bulanan penilai",
    ]);
    expect(view.rows.map((row) => plain(row.value))).toEqual(["Versi 1", "12", "Rp 15.251", "Rp 500.000"]);
  });

  // Positive (C2): the Nilai dialog grades with the active version, so it says so.
  it("marks the version as aktif when the server picked the active one", () => {
    const view = toEstimateView(gradeEstimate({ rubric_version: "v8" }), { activeVersion: true });

    expect(valueOf(view, "Versi rubrik")).toBe("Versi 8 · aktif");
  });

  // Negative: Nilai ulang may pick an older version, so nothing is claimed about it.
  it("does not call a chosen version aktif", () => {
    const view = toEstimateView(gradeEstimate({ rubric_version: "v8" }), { activeVersion: false });

    expect(valueOf(view, "Versi rubrik")).toBe("Versi 8");
  });

  it("shows the remaining budget rounded down, never above the real amount", () => {
    const view = toEstimateView(gradeEstimate({ remaining_budget_idr: "500000.99" }));

    expect(valueOf(view, "Sisa anggaran bulanan penilai")).toBe("Rp 500.000");
  });

  it("keeps a remaining budget above 2^53 exact", () => {
    const view = toEstimateView(gradeEstimate({ remaining_budget_idr: "9007199254740993.00" }));

    expect(valueOf(view, "Sisa anggaran bulanan penilai")).toBe("Rp 9.007.199.254.740.993");
  });

  // Zero is a valid price (a free judge), not a missing value.
  it("shows a zero cost as Rp 0", () => {
    const view = toEstimateView(gradeEstimate({ estimated_cost_idr: "0.00" }));

    expect(valueOf(view, "Perkiraan biaya")).toBe("Rp 0");
  });

  it("shows a version label that is not v<number> as the server sent it", () => {
    const view = toEstimateView(gradeEstimate({ rubric_version: "draft" }));

    expect(valueOf(view, "Versi rubrik")).toBe("draft");
  });

  it("passes budget_sufficient through instead of comparing the amounts again", () => {
    const view = toEstimateView(
      gradeEstimate({ estimated_cost_idr: "1.00", remaining_budget_idr: "999999.00", budget_sufficient: false }),
    );

    expect(view.budgetSufficient).toBe(false);
  });

  it.each([
    [0, false],
    [1, true],
  ])("reports hasAttempts for %i attempts to grade", (attempts, expected) => {
    const view = toEstimateView(gradeEstimate({ attempts_to_grade: attempts }));

    expect(view.hasAttempts).toBe(expected);
  });
});

describe("canStartGrading (PBI-14 AC6)", () => {
  const sufficient = toEstimateView(gradeEstimate());
  const short = toEstimateView(gradeEstimate({ budget_sufficient: false }));

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
    const empty = toEstimateView(gradeEstimate({ attempts_to_grade: 0, estimated_cost_idr: "0.00" }));

    expect(canStartGrading({ status: "ready", data: empty })).toBe(true);
  });
});

describe("estimate texts", () => {
  it("tells the Admin what a short budget means for the start button", () => {
    expect(BUDGET_SHORT_TEXT).toBe(
      "Perkiraan biaya melebihi sisa anggaran bulanan penilai ini. Penilaian belum bisa dimulai. Tambah anggaran produk ini di halaman Produk AI atau pilih penilai lain.",
    );
  });

  it("explains an estimate with no attempts to grade", () => {
    expect(NO_ATTEMPTS_TEXT).toBe("Tidak ada percobaan yang perlu dikirim ke penilai LLM, jadi penilaian ini tidak memakai anggaran.");
  });
});
