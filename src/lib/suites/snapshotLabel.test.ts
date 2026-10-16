import { describe, expect, it } from "vitest";
import { snapshotLabel } from "./snapshotLabel";

describe("snapshotLabel", () => {
  // Positive: the example from SCRUM-138.
  it("names a snapshot after its creation time in WIB", () => {
    // Arrange
    const createdAt = "2026-10-03T07:05:00Z";

    // Act
    const label = snapshotLabel(createdAt);

    // Assert
    expect(label).toBe("Snapshot 03 Okt 2026, 14.05 WIB");
  });

  // Edge: two snapshots a minute apart stay distinguishable.
  it("keeps snapshots created a minute apart apart", () => {
    // Arrange
    const first = "2026-10-03T07:05:00Z";
    const second = "2026-10-03T07:06:00Z";

    // Act
    const labels = [snapshotLabel(first), snapshotLabel(second)];

    // Assert
    expect(labels).toEqual(["Snapshot 03 Okt 2026, 14.05 WIB", "Snapshot 03 Okt 2026, 14.06 WIB"]);
  });

  // Negative: a value that is not a date is shown, not hidden.
  it("keeps the text when the time cannot be read", () => {
    // Arrange
    const createdAt = "rusak";

    // Act
    const label = snapshotLabel(createdAt);

    // Assert
    expect(label).toBe("Snapshot rusak");
  });
});
