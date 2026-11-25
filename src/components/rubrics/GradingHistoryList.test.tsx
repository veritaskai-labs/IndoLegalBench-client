import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { gradingResponse, gradingRunSummary } from "@/test/gradingFixtures";
import { GradingHistoryList } from "./GradingHistoryList";

function items() {
  return within(screen.getByRole("list", { name: "Riwayat penilaian" })).getAllByRole("listitem");
}

describe("GradingHistoryList (AC7: hasil lama tetap tersimpan, versi rubrik terlihat)", () => {
  // Positive: what one entry tells the Admin.
  it("shows kind, rubric version, status and time of a run", () => {
    // Arrange
    const runs = [gradingResponse({ triggered_at: "2026-11-06T03:05:00Z" })];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    const [item] = items();
    expect(item).toHaveTextContent("Nilai pertama");
    expect(item).toHaveTextContent("Versi 1");
    expect(item).toHaveTextContent("Selesai");
    expect(item).toHaveTextContent("06 Nov 2026, 10.05 WIB");
  });

  // Edge: when more than one run is given, the old one stays and only the new one carries the marker.
  it("marks only the latest run and keeps the older one", () => {
    // Arrange
    const runs = [
      gradingResponse({ grading_run_id: "r-1", is_latest: false, triggered_at: "2026-11-01T03:00:00Z" }),
      gradingResponse({ grading_run_id: "r-2", kind: "regrade", rubric_version: "v2", triggered_at: "2026-11-06T03:00:00Z" }),
    ];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    const [newer, older] = items();
    expect(newer).toHaveTextContent("Nilai ulang");
    expect(newer).toHaveTextContent("Versi 2");
    expect(within(newer).getByText("Terbaru")).toBeInTheDocument();
    expect(older).toHaveTextContent("Nilai pertama");
    expect(within(older).queryByText("Terbaru")).not.toBeInTheDocument();
  });

  it("lists the newest run first whatever order it was given", () => {
    // Arrange
    const runs = [
      gradingResponse({ grading_run_id: "old", is_latest: false, triggered_at: "2026-11-01T03:00:00Z" }),
      gradingResponse({ grading_run_id: "new", kind: "regrade", triggered_at: "2026-11-06T03:00:00Z" }),
    ];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    expect(items().map((item) => item.textContent?.includes("Nilai ulang"))).toEqual([true, false]);
  });

  // Negative: a session that was never graded has no result, and the dialog says so.
  it("shows a plain message and no list when there are no runs", () => {
    // Arrange / Act
    render(<GradingHistoryList runs={[]} />);

    // Assert
    expect(screen.getByText("Belum ada hasil penilaian untuk sesi ini.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  // K-17: the history says which judge graded each run and what the judge calls cost.
  it("shows the judge, its model and the recorded cost of a run", () => {
    // Arrange
    const runs = [
      gradingRunSummary({
        judge: { judge_provider_id: "judge-a", name: "DeepSeek", model_version: "deepseek-chat", cost_idr: "1500.00" },
      }),
    ];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    const [item] = items();
    expect(item).toHaveTextContent("DeepSeek · deepseek-chat");
    expect(item).toHaveTextContent(/Biaya tercatat Rp\s?1\.500/);
  });
});

describe("GradingHistoryList choosing a run (K-17/K-18, SCRUM-283)", () => {
  const RUNS = [
    gradingRunSummary({ grading_run_id: "run-2", kind: "regrade", triggered_at: "2026-11-07T05:00:00Z" }),
    gradingRunSummary({ grading_run_id: "run-1", is_latest: false, triggered_at: "2026-11-07T03:00:00Z" }),
  ];

  // Positive: an older run can be opened from the list.
  it("tells the page which run was chosen", async () => {
    // Arrange
    const onSelect = vi.fn();
    render(<GradingHistoryList runs={RUNS} selectedId="run-2" onSelect={onSelect} />);
    const [, older] = items();

    // Act
    await userEvent.setup().click(within(older).getByRole("button"));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("run-1");
  });

  // Positive: the run shown below the list is marked, so the Admin knows what the scores belong to.
  it("marks the run that is shown", () => {
    // Arrange / Act
    render(<GradingHistoryList runs={RUNS} selectedId="run-1" onSelect={vi.fn()} />);

    // Assert
    const [newer, older] = items();
    expect(within(older).getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(within(newer).getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  // Negative: without onSelect the list is read only, as before.
  it("has no buttons when nothing can be chosen", () => {
    // Arrange / Act
    render(<GradingHistoryList runs={RUNS} />);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
