import { describe, expect, it } from "vitest";
import { formatWib, formatWibClock, formatWibDate } from "./formatWib";


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

describe("formatWibClock", () => {
  // Positive: dasbor hanya butuh jamnya, tanggalnya sudah jelas dari konteks.
  it("shows only the WIB clock of a UTC time", () => {
    // Arrange
    const iso = "2026-10-03T07:05:00Z";

    // Act
    const text = formatWibClock(iso);

    // Assert
    expect(text).toBe("14.05");
  });

  // Edge: pergeseran 7 jam melewati tengah malam.
  it("reads the clock after WIB passes midnight", () => {
    // Arrange
    const iso = "2026-12-31T20:30:00Z";

    // Act
    const text = formatWibClock(iso);

    // Assert
    expect(text).toBe("03.30");
  });

  it("pads single digit hours and minutes", () => {
    // Arrange
    const iso = "2026-02-02T18:04:00Z";

    // Act
    const text = formatWibClock(iso);

    // Assert
    expect(text).toBe("01.04");
  });

  // Negative: penanda waktu yang tidak terbaca lebih baik hilang daripada tampil rusak.
  it("returns an empty string when the input is not a date", () => {
    // Arrange
    const iso = "bukan tanggal";

    // Act
    const text = formatWibClock(iso);

    // Assert
    expect(text).toBe("");
  });
});
describe("formatWibDate", () => {
  // Positive: tanggal berlaku rubrik datang dari server sebagai tanggal saja.
  it("shows a date-only value as day, month and year without a clock", () => {
    // Arrange
    const isoDate = "2026-10-27";

    // Act
    const text = formatWibDate(isoDate);

    // Assert
    expect(text).toBe("27 Okt 2026");
  });

  it("pads a single digit day", () => {
    // Arrange
    const isoDate = "2026-02-02";

    // Act
    const text = formatWibDate(isoDate);

    // Assert
    expect(text).toBe("02 Feb 2026");
  });

  // Edge: the date is the WIB date, so 20:30 UTC already belongs to the next day.
  it("reads the WIB date of a timestamp that crosses midnight", () => {
    // Arrange
    const iso = "2026-12-31T20:30:00Z";

    // Act
    const text = formatWibDate(iso);

    // Assert
    expect(text).toBe("01 Jan 2027");
  });

  // Negative: a value that is not a date is returned as it came, like formatWib.
  it("returns the input as is when it is not a date", () => {
    // Arrange
    const isoDate = "bukan tanggal";

    // Act
    const text = formatWibDate(isoDate);

    // Assert
    expect(text).toBe("bukan tanggal");
  });
});
