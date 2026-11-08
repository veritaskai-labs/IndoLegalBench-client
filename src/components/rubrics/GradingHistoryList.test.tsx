import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { gradingResponse } from "@/test/gradingFixtures";
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
});
