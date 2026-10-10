import { describe, expect, it } from "vitest";
import { formatWib } from "./formatWib";

describe("formatWib", () => {
  // Positive: the example from SCRUM-138.
  it("shows a UTC time as WIB, 7 hours ahead", () => {
    // Arrange
    const iso = "2026-10-03T07:05:00Z";

    // Act
    const text = formatWib(iso);

    // Assert
    expect(text).toBe("03 Okt 2026, 14.05 WIB");
  });

  it("uses Indonesian month abbreviations", () => {
    // Arrange
    const iso = "2026-05-15T03:00:00Z";

    // Act
    const text = formatWib(iso);

    // Assert
    expect(text).toBe("15 Mei 2026, 10.00 WIB");
  });

  // Edge: the 7 hour shift crosses midnight, the month, and the year.
  it("moves to the next day, month and year when WIB passes midnight", () => {
    // Arrange
    const iso = "2026-12-31T20:30:00Z";

    // Act
    const text = formatWib(iso);

    // Assert
    expect(text).toBe("01 Jan 2027, 03.30 WIB");
  });

  it("pads single digit hours and minutes", () => {
    // Arrange
    const iso = "2026-02-02T18:04:00Z";

    // Act
    const text = formatWib(iso);

    // Assert
    expect(text).toBe("03 Feb 2026, 01.04 WIB");
  });

  it("reads a timestamp that already carries a +07:00 offset", () => {
    // Arrange
    const iso = "2026-10-03T14:05:00+07:00";

    // Act
    const text = formatWib(iso);

    // Assert
    expect(text).toBe("03 Okt 2026, 14.05 WIB");
  });

  // Negative
  it("returns the input unchanged when it is not a date", () => {
    // Arrange
    const iso = "bukan tanggal";

    // Act
    const text = formatWib(iso);

    // Assert
    expect(text).toBe("bukan tanggal");
  });

  it("returns an empty string unchanged", () => {
    // Arrange
    const iso = "";

    // Act
    const text = formatWib(iso);

    // Assert
    expect(text).toBe("");
  });
});
