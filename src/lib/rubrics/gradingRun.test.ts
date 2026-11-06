import { describe, expect, it } from "vitest";

import type { GradingRun } from "@/types/rubric";
import { toRunRow, toRunRows } from "./gradingRun";

function run(overrides: Partial<GradingRun> = {}): GradingRun {
  return {
    id: "r-1",
    kind: "initial",
    status: "finished",
    rubric_version_id: "v-1",
    rubric_version_no: 1,
    triggered_by_name: "Aileen",
    triggered_at: "2026-11-06T03:05:00Z",
    is_latest: true,
    ...overrides,
  };
}

describe("toRunRow (AC7: riwayat nilai ulang)", () => {
  // Positive: what the history shows for the first grading.
  it("shows kind, status, rubric version, time in WIB and who started it", () => {
    // Arrange
    const source = run();

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row).toEqual({
      id: "r-1",
      kindLabel: "Nilai pertama",
      statusLabel: "Selesai",
      versionLabel: "Versi 1",
      triggeredAt: "06 Nov 2026, 10.05 WIB",
      triggeredBy: "Aileen",
      isLatest: true,
    });
  });

  it("calls a regrade run Nilai ulang", () => {
    // Arrange
    const source = run({ kind: "regrade", rubric_version_no: 2 });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.kindLabel).toBe("Nilai ulang");
    expect(row.versionLabel).toBe("Versi 2");
  });

  it.each([
    ["queued", "Menunggu"],
    ["running", "Berjalan"],
    ["finished", "Selesai"],
    ["failed", "Gagal"],
  ] as const)("labels a %s run as %s", (status, label) => {
    // Arrange
    const source = run({ status });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.statusLabel).toBe(label);
  });

  // Edge: older results are kept but are no longer the latest.
  it("does not mark an older run as latest", () => {
    // Arrange
    const source = run({ is_latest: false });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.isLatest).toBe(false);
  });

  // Edge: the account that started the run can be gone, the server sends null.
  it("shows a dash when the person who started the run is unknown", () => {
    // Arrange
    const source = run({ triggered_by_name: null });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.triggeredBy).toBe("-");
  });

  // Negative: a timestamp that is not a date is shown as it came, not as "Invalid Date".
  it("shows the raw value when the time is not a date", () => {
    // Arrange
    const source = run({ triggered_at: "bukan tanggal" });

    // Act
    const row = toRunRow(source);

    // Assert
    expect(row.triggeredAt).toBe("bukan tanggal");
  });
});

describe("toRunRows", () => {
  // Positive: the newest run is at the top, whatever order the server sent.
  it("orders runs by start time, newest first", () => {
    // Arrange
    const runs = [
      run({ id: "old", triggered_at: "2026-11-01T03:00:00Z" }),
      run({ id: "new", triggered_at: "2026-11-06T03:00:00Z" }),
      run({ id: "mid", triggered_at: "2026-11-03T03:00:00Z" }),
    ];

    // Act
    const rows = toRunRows(runs);

    // Assert
    expect(rows.map((row) => row.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not change the array it was given", () => {
    // Arrange
    const runs = [run({ id: "a", triggered_at: "2026-11-01T03:00:00Z" }), run({ id: "b", triggered_at: "2026-11-06T03:00:00Z" })];

    // Act
    toRunRows(runs);

    // Assert
    expect(runs.map((r) => r.id)).toEqual(["a", "b"]);
  });

  // Edge: same start time keeps the server order, so the list does not jump on reload.
  it("keeps the given order for runs that started at the same time", () => {
    // Arrange
    const runs = [run({ id: "a" }), run({ id: "b" }), run({ id: "c" })];

    // Act
    const rows = toRunRows(runs);

    // Assert
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  // Edge: a session that was never graded has an empty history.
  it("returns no rows for no runs", () => {
    // Arrange
    const runs: GradingRun[] = [];

    // Act
    const rows = toRunRows(runs);

    // Assert
    expect(rows).toEqual([]);
  });

  // Negative: an unreadable time sorts last instead of breaking the order of the others.
  it("puts a run with an unreadable time after the readable ones", () => {
    // Arrange
    const runs = [
      run({ id: "bad", triggered_at: "bukan tanggal" }),
      run({ id: "old", triggered_at: "2026-11-01T03:00:00Z" }),
      run({ id: "new", triggered_at: "2026-11-06T03:00:00Z" }),
    ];

    // Act
    const rows = toRunRows(runs);

    // Assert
    expect(rows.map((row) => row.id)).toEqual(["new", "old", "bad"]);
  });
});
