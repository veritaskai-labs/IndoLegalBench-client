import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatLastModified, formatRelativeTime, formatWib, formatWibClock, formatWibDate } from "./formatWib";


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

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats minutes, hours, days, and falls back to WIB date after 7 days", () => {
    vi.useFakeTimers();
    const now = new Date("2026-11-28T12:00:00Z");
    vi.setSystemTime(now);

    expect(formatRelativeTime("2026-11-28T11:59:40Z")).toBe("Baru saja");
    expect(formatRelativeTime("2026-11-28T11:45:00Z")).toBe("15 menit yang lalu");
    expect(formatRelativeTime("2026-11-28T09:00:00Z")).toBe("3 jam yang lalu");
    expect(formatRelativeTime("2026-11-27T12:00:00Z")).toBe("Kemarin");
    expect(formatRelativeTime("2026-11-25T12:00:00Z")).toBe("3 hari yang lalu");
    expect(formatRelativeTime("2026-11-20T00:00:00Z")).toBe("20 Nov 2026");
  });

  it("returns non-date strings unchanged", () => {
    expect(formatRelativeTime("bukan tanggal")).toBe("bukan tanggal");
  });
});

describe("formatLastModified (SCRUM-381, kolom Terakhir Kali Diubah)", () => {
  // Fixed clock: 28 Nov 2026 12:00 UTC is 19.00 WIB.
  const NOW = "2026-11-28T12:00:00Z";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Positive: the ticket's own examples and the boundaries between each band.
  it.each([
    ["2026-11-28T11:59:40Z", "Baru saja"],
    ["2026-11-28T11:20:00Z", "40 menit lalu"],
    ["2026-11-28T11:01:00Z", "59 menit lalu"],
    ["2026-11-28T11:00:00Z", "1 jam lalu"],
    ["2026-11-28T07:00:00Z", "5 jam lalu"],
    ["2026-11-27T12:01:00Z", "23 jam lalu"],
    ["2026-11-27T12:00:00Z", "Kemarin"],
    ["2026-11-26T12:01:00Z", "Kemarin"],
    ["2026-11-26T12:00:00Z", "2 hari lalu"],
    ["2026-11-25T12:00:00Z", "3 hari lalu"],
    ["2026-11-21T12:01:00Z", "6 hari lalu"],
  ])("shows %s as %s", (iso, expected) => {
    // Arrange / Act
    const text = formatLastModified(iso);

    // Assert
    expect(text).toBe(expected);
  });

  // Positive: from one week on, the date and the WIB time, so a reader can tell two edits on the same day apart.
  it.each([
    ["2026-11-21T12:00:00Z", "21 Nov 2026, 19.00 WIB"],
    ["2026-10-03T07:05:00Z", "03 Okt 2026, 14.05 WIB"],
  ])("shows %s as the WIB date and time after a week", (iso, expected) => {
    // Arrange / Act
    const text = formatLastModified(iso);

    // Assert
    expect(text).toBe(expected);
  });

  // Edge: a timestamp slightly ahead of this browser's clock must not read as "dalam X menit" or crash.
  it("shows a time in the future as the WIB date and time", () => {
    // Arrange / Act
    const text = formatLastModified("2026-11-28T12:05:00Z");

    // Assert
    expect(text).toBe("28 Nov 2026, 19.05 WIB");
  });

  // Negative: text that is not a date is shown as it came.
  it("returns non-date strings unchanged", () => {
    // Arrange / Act
    const text = formatLastModified("bukan tanggal");

    // Assert
    expect(text).toBe("bukan tanggal");
  });

  // Edge: the existing formatRelativeTime (SuiteList, suite page) keeps its own wording.
  it("leaves formatRelativeTime unchanged", () => {
    // Arrange / Act
    const text = formatRelativeTime("2026-11-28T11:20:00Z");

    // Assert
    expect(text).toBe("40 menit yang lalu");
  });
});
