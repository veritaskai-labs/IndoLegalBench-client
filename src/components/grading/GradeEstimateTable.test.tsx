import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BUDGET_SHORT_TEXT, NO_ATTEMPTS_TEXT, toEstimateView } from "@/lib/grading/gradeEstimate";
import { gradeEstimate } from "@/test/gradingFixtures";
import { GradeEstimateTable } from "./GradeEstimateTable";

const JUDGES = [{ id: "judge-a", name: "Judge Alfa", provider_type: "openai_compatible" as const, model_name: "m" }];

function ready(overrides: Parameters<typeof gradeEstimate>[0] = {}) {
  return { status: "ready" as const, data: toEstimateView(gradeEstimate(overrides), JUDGES), reload: vi.fn() };
}

describe("GradeEstimateTable (PBI-14 AC6)", () => {
  it("shows attempts, rubric version, judge, estimated cost and remaining budget as a table", () => {
    render(<GradeEstimateTable estimate={ready()} />);

    const table = within(screen.getByRole("table", { name: "Perkiraan biaya penilaian" }));
    expect(table.getByRole("rowheader", { name: "Jumlah percobaan" }).nextElementSibling).toHaveTextContent("12");
    expect(table.getByRole("rowheader", { name: "Versi rubrik" }).nextElementSibling).toHaveTextContent("Versi 1");
    expect(table.getByRole("rowheader", { name: "LLM judge" }).nextElementSibling).toHaveTextContent("Judge Alfa");
    expect(table.getByRole("rowheader", { name: "Perkiraan biaya" }).nextElementSibling).toHaveTextContent("Rp 15.251");
    expect(table.getByRole("rowheader", { name: "Sisa anggaran judge" }).nextElementSibling).toHaveTextContent("Rp 500.000");
  });

  it("shows no warning when the budget is enough", () => {
    render(<GradeEstimateTable estimate={ready()} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // AC6: the warning says why the start button is off.
  it("warns when the estimated cost is above the remaining budget", () => {
    render(<GradeEstimateTable estimate={ready({ budget_sufficient: false, estimated_cost_idr: "600000.00" })} />);

    expect(screen.getByRole("alert")).toHaveTextContent(BUDGET_SHORT_TEXT);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("says nothing is sent to the judge when there are no attempts to grade", () => {
    render(<GradeEstimateTable estimate={ready({ attempts_to_grade: 0, estimated_cost_idr: "0.00" })} />);

    expect(screen.getByText(NO_ATTEMPTS_TEXT)).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Perkiraan biaya" }).nextElementSibling).toHaveTextContent("Rp 0");
  });

  it("does not mention an empty grading when there are attempts", () => {
    render(<GradeEstimateTable estimate={ready()} />);

    expect(screen.queryByText(NO_ATTEMPTS_TEXT)).not.toBeInTheDocument();
  });

  it("shows a loading state and no table while the estimate loads", () => {
    render(<GradeEstimateTable estimate={{ status: "loading", reload: vi.fn() }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Memuat perkiraan biaya…");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the error and loads again when the Admin retries", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    render(<GradeEstimateTable estimate={{ status: "error", message: "Perkiraan biaya gagal dimuat. Coba lagi.", reload }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Perkiraan biaya gagal dimuat. Coba lagi.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  // Re-grade before a judge is picked: nothing was asked, so nothing is shown.
  it("renders nothing when no estimate was requested", () => {
    const { container } = render(<GradeEstimateTable estimate={{ status: "ready", data: null, reload: vi.fn() }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
