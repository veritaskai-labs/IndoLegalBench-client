import { describe, expect, it } from "vitest";

import { gradingResponse, gradingRunSummary } from "@/test/gradingFixtures";
import { toRunRow, toRunRows } from "./gradingRun";

describe("toRunRow (AC7: hasil terbaru dan versi rubriknya)", () => {
  // Positive: what the dialog shows for the first grading.
  it("shows kind, status, rubric version and time in WIB", () => {
    // Arrange
    const source = gradingResponse({ triggered_at: "2026-11-06T03:05:00Z" });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row).toEqual({
      id: "run-1",
      kindLabel: "Nilai pertama",
      statusLabel: "Selesai",
      versionLabel: "Versi 1",
      triggeredAt: "06 Nov 2026, 10.05 WIB",
      isLatest: true,
    });
  });

  it("calls a regrade run Nilai ulang and reads the version number from its label", () => {
    // Arrange
    const source = gradingResponse({ kind: "regrade", rubric_version: "v2" });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.kindLabel).toBe("Nilai ulang");
    expect(row.versionLabel).toBe("Versi 2");
  });

  // Edge: the server status is a free string; only "completed" is known today.
  it("shows an unknown status as the server sent it", () => {
    // Arrange
    const source = gradingResponse({ status: "queued" });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.statusLabel).toBe("queued");
  });

  // Edge: older results are kept but are no longer the latest.
  it("does not mark an older run as latest", () => {
    // Arrange
    const source = gradingResponse({ is_latest: false });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.isLatest).toBe(false);
  });

  // Edge: the contract defaults is_latest to true, so a result without the field is the latest one.
  it("treats a result without is_latest as the latest one", () => {
    // Arrange
    const source = gradingResponse({ is_latest: undefined });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.isLatest).toBe(true);
  });

  // Edge: a label the client cannot read as "v<number>" is shown as it came.
  it("shows the raw label when the rubric version is not v<number>", () => {
    // Arrange
    const source = gradingResponse({ rubric_version: "legacy" });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.versionLabel).toBe("legacy");
  });

  // Negative: a timestamp that is not a date is shown as it came, not as "Invalid Date".
  it("shows the raw value when the time is not a date", () => {
    // Arrange
    const source = gradingResponse({ triggered_at: "bukan tanggal" });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.triggeredAt).toBe("bukan tanggal");
  });
});

describe("toRunRow with a history summary (GET /grading-runs)", () => {
  // The history rows have no cases, but show the same text as a full result.
  it("builds the same row from a summary as from a full result", () => {
    // Arrange
    const summary = gradingRunSummary({ kind: "regrade", rubric_version: "v2", triggered_at: "2026-11-06T03:05:00Z" });

    // Act
    const row = toRunRow(summary);

    // Assert
    expect(row).toEqual({
      id: "run-1",
      kindLabel: "Nilai ulang",
      statusLabel: "Selesai",
      versionLabel: "Versi 2",
      triggeredAt: "06 Nov 2026, 10.05 WIB",
      isLatest: true,
    });
  });
});

describe("toRunRows", () => {
  // Positive: the newest run is at the top, whatever order the source had.
  it("orders runs by start time, newest first", () => {
    // Arrange
    const runs = [
      gradingResponse({ grading_run_id: "old", triggered_at: "2026-11-01T03:00:00Z" }),
      gradingResponse({ grading_run_id: "new", triggered_at: "2026-11-06T03:00:00Z" }),
      gradingResponse({ grading_run_id: "mid", triggered_at: "2026-11-03T03:00:00Z" }),
    ];

    // Act
    const rows = toRunRows(runs);

    // Assert
    expect(rows.map((row) => row.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not change the array it was given", () => {
    // Arrange
    const runs = [
      gradingResponse({ grading_run_id: "a", triggered_at: "2026-11-01T03:00:00Z" }),
      gradingResponse({ grading_run_id: "b", triggered_at: "2026-11-06T03:00:00Z" }),
    ];

    // Act
    toRunRows(runs);

    // Assert
    expect(runs.map((r) => r.grading_run_id)).toEqual(["a", "b"]);
  });

  // Edge: same start time keeps the given order, so the list does not jump on reload.
  it("keeps the given order for runs that started at the same time", () => {
    // Arrange
    const runs = ["a", "b", "c"].map((id) => gradingResponse({ grading_run_id: id }));

    // Act
    const rows = toRunRows(runs);

    // Assert
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  // Edge: a session that was never graded has an empty history.
  it("returns no rows for no runs", () => {
    // Arrange / Act
    const rows = toRunRows([]);

    // Assert
    expect(rows).toEqual([]);
  });

  // Negative: an unreadable time sorts last instead of breaking the order of the others.
  it("puts a run with an unreadable time after the readable ones", () => {
    // Arrange
    const runs = [
      gradingResponse({ grading_run_id: "bad", triggered_at: "bukan tanggal" }),
      gradingResponse({ grading_run_id: "old", triggered_at: "2026-11-01T03:00:00Z" }),
      gradingResponse({ grading_run_id: "new", triggered_at: "2026-11-06T03:00:00Z" }),
    ];

    // Act
    const rows = toRunRows(runs);

    // Assert
    expect(rows.map((row) => row.id)).toEqual(["new", "old", "bad"]);
  });
});
