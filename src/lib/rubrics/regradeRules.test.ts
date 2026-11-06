import { describe, expect, it } from "vitest";

import type { GradingRun, RubricVersion } from "@/types/rubric";
import { REGRADE_UNAVAILABLE_TEXT, regradeAvailability } from "./regradeRules";

function version(no: number): RubricVersion {
  return { id: `v-${no}`, version_no: no } as RubricVersion;
}

function run(overrides: Partial<GradingRun> = {}): GradingRun {
  return {
    id: "r-1",
    kind: "initial",
    status: "finished",
    rubric_version_id: "v-1",
    rubric_version_no: 1,
    triggered_by_name: "Aileen",
    triggered_at: "2026-11-06T03:00:00Z",
    is_latest: true,
    ...overrides,
  };
}

describe("regradeAvailability (AC7: Nilai ulang dengan versi terbaru)", () => {
  // Positive: graded with v1 while v2 exists, so re-grading with v2 makes sense.
  it("offers the newest version to an Admin when the session was graded with an older one", () => {
    // Arrange
    const versions = [version(1), version(2)];
    const runs = [run()];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs });

    // Assert
    expect(result).toEqual({ available: true, version: version(2) });
  });

  // Edge: "terbaru" is the highest number, whatever order the server listed the versions in.
  it("picks the highest version number whatever the order", () => {
    // Arrange
    const versions = [version(3), version(1), version(2)];
    const runs = [run()];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs });

    // Assert
    expect(result).toMatchObject({ available: true, version: { id: "v-3" } });
  });

  // Edge: older results are kept, so the history can hold several runs; only the latest counts.
  it("compares with the run marked latest, not with older runs", () => {
    // Arrange
    const versions = [version(1), version(2)];
    const runs = [
      run({ id: "r-2", kind: "regrade", rubric_version_id: "v-2", rubric_version_no: 2, is_latest: true }),
      run({ id: "r-1", is_latest: false }),
    ];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs });

    // Assert
    expect(result).toEqual({ available: false, reason: "already_latest" });
  });

  // Negative: each reason the button stays off, in the order the Admin would care about.
  it.each(["developer_ai", "viewer"] as const)("is not offered to %s", (role) => {
    // Arrange
    const versions = [version(1), version(2)];
    const runs = [run()];

    // Act
    const result = regradeAvailability({ role, versions, runs });

    // Assert
    expect(result).toEqual({ available: false, reason: "not_admin" });
  });

  it("needs at least one rubric version", () => {
    // Arrange
    const runs = [run()];

    // Act
    const result = regradeAvailability({ role: "admin", versions: [], runs });

    // Assert
    expect(result).toEqual({ available: false, reason: "no_rubric" });
  });

  // Edge: the first grading is the Nilai button of SCRUM-227, so there is nothing to re-grade yet.
  it("needs the session to have been graded before", () => {
    // Arrange
    const versions = [version(1), version(2)];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs: [] });

    // Assert
    expect(result).toEqual({ available: false, reason: "never_graded" });
  });

  it("treats a session whose runs never finished as never graded", () => {
    // Arrange
    const versions = [version(1), version(2)];
    const runs = [run({ status: "failed", is_latest: false })];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs });

    // Assert
    expect(result).toEqual({ available: false, reason: "never_graded" });
  });

  it("is off when the latest result already used the newest version", () => {
    // Arrange
    const versions = [version(1), version(2)];
    const runs = [run({ rubric_version_id: "v-2", rubric_version_no: 2 })];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs });

    // Assert
    expect(result).toEqual({ available: false, reason: "already_latest" });
  });

  // Edge: the run's own version number counts, so a version missing from the list cannot reopen the button.
  it("is off when the run used a version newer than anything in the list", () => {
    // Arrange
    const versions = [version(1)];
    const runs = [run({ rubric_version_id: "v-9", rubric_version_no: 9 })];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs });

    // Assert
    expect(result).toEqual({ available: false, reason: "already_latest" });
  });

  // Negative: a second run while one is queued or running would race on the "latest" marker.
  it.each(["queued", "running"] as const)("is off while a grading run is %s", (status) => {
    // Arrange
    const versions = [version(1), version(2)];
    const runs = [run({ id: "r-2", kind: "regrade", status, is_latest: false }), run()];

    // Act
    const result = regradeAvailability({ role: "admin", versions, runs });

    // Assert
    expect(result).toEqual({ available: false, reason: "in_progress" });
  });

  it("reports a missing role before anything else", () => {
    // Arrange / Act
    const result = regradeAvailability({ role: "viewer", versions: [], runs: [] });

    // Assert
    expect(result).toEqual({ available: false, reason: "not_admin" });
  });
});

describe("REGRADE_UNAVAILABLE_TEXT", () => {
  // The Admin sees why the button is off; a viewer is not shown the button at all.
  it("explains every reason the button can be off, except not_admin which hides it", () => {
    // Arrange / Act
    const text = REGRADE_UNAVAILABLE_TEXT;

    // Assert
    expect(text).toEqual({
      no_rubric: "Belum ada versi rubrik. Buat versi rubrik dulu di halaman Rubrik.",
      never_graded: "Sesi ini belum pernah dinilai. Gunakan tombol Nilai terlebih dahulu.",
      already_latest: "Hasil terbaru sudah memakai versi rubrik terbaru.",
      in_progress: "Penilaian sedang berjalan. Tunggu sampai selesai.",
    });
  });
});
