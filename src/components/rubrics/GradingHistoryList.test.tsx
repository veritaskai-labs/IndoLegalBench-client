import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeGradingRun } from "@/test/rubricFixtures";
import { GradingHistoryList } from "./GradingHistoryList";

function items() {
  return within(screen.getByRole("list", { name: "Riwayat penilaian" })).getAllByRole("listitem");
}

describe("GradingHistoryList (AC7: hasil lama tetap tersimpan, ada riwayat nilai ulang)", () => {
  // Positive: what one entry tells the Admin.
  it("shows kind, rubric version, status, time and who started a run", () => {
    // Arrange
    const runs = [makeGradingRun()];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    const [item] = items();
    expect(item).toHaveTextContent("Nilai pertama");
    expect(item).toHaveTextContent("Versi 1");
    expect(item).toHaveTextContent("Selesai");
    expect(item).toHaveTextContent("06 Nov 2026, 10.05 WIB");
    expect(item).toHaveTextContent("Aileen");
  });

  // Edge: after a re-grade the old run stays in the list and only the new one carries the marker.
  it("marks only the latest run and keeps the older one", () => {
    // Arrange
    const runs = [
      makeGradingRun({ id: "r-1", is_latest: false, triggered_at: "2026-11-01T03:00:00Z" }),
      makeGradingRun({ id: "r-2", kind: "regrade", rubric_version_id: "v-2", rubric_version_no: 2, triggered_at: "2026-11-06T03:00:00Z" }),
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

  it("lists the newest run first whatever order the server sent", () => {
    // Arrange
    const runs = [
      makeGradingRun({ id: "old", triggered_at: "2026-11-01T03:00:00Z", is_latest: false }),
      makeGradingRun({ id: "new", kind: "regrade", triggered_at: "2026-11-06T03:00:00Z" }),
    ];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    expect(items().map((item) => item.textContent?.includes("Nilai ulang"))).toEqual([true, false]);
  });

  // Edge: a run that is still going is shown with its status, not hidden.
  it("shows a queued run as Menunggu", () => {
    // Arrange
    const runs = [makeGradingRun({ status: "queued", is_latest: false })];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    expect(items()[0]).toHaveTextContent("Menunggu");
  });

  // Edge: the account that started the run can be gone.
  it("shows a dash when the person who started the run is unknown", () => {
    // Arrange
    const runs = [makeGradingRun({ triggered_by_name: null })];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    expect(items()[0]).toHaveTextContent("oleh -");
  });

  // Negative: a session that was never graded has no history, and the dialog says so.
  it("shows a plain message and no list when there are no runs", () => {
    // Arrange
    const runs: [] = [];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    expect(screen.getByText("Belum ada riwayat penilaian untuk sesi ini.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
