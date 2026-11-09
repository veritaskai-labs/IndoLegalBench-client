import { describe, expect, it } from "vitest";
import { isoToWibInput, nowWibInput, wibInputToIso } from "./wibInput";

describe("wibInputToIso", () => {
  // Positive: the picker value is read as WIB, so the server gets it 7 hours earlier in UTC.
  it("reads a datetime-local value as WIB and returns ISO UTC", () => {
    // Arrange
    const input = "2026-11-08T10:30";

    // Act
    const iso = wibInputToIso(input);

    // Assert
    expect(iso).toBe("2026-11-08T03:30:00.000Z");
  });

  // Edge: early WIB hours fall on the previous UTC day, even across a year change.
  it("moves to the previous UTC day when WIB is before 07.00", () => {
    // Arrange
    const input = "2027-01-01T05:15";

    // Act
    const iso = wibInputToIso(input);

    // Assert
    expect(iso).toBe("2026-12-31T22:15:00.000Z");
  });

  // Edge: the picker may include seconds.
  it("accepts a value with seconds", () => {
    // Arrange
    const input = "2026-11-08T10:30:45";

    // Act
    const iso = wibInputToIso(input);

    // Assert
    expect(iso).toBe("2026-11-08T03:30:45.000Z");
  });

  // Negative: an empty or malformed value has no time to send.
  it.each(["", "kemarin", "2026-13-40T99:99"])("returns null for %j", (input) => {
    // Arrange
    // (input comes from the table)

    // Act
    const iso = wibInputToIso(input);

    // Assert
    expect(iso).toBeNull();
  });
});

describe("isoToWibInput", () => {
  // Positive: the reverse direction, used to prefill the picker with a saved time.
  it("shows an ISO UTC time as a WIB datetime-local value", () => {
    // Arrange
    const iso = "2026-11-08T03:30:00Z";

    // Act
    const input = isoToWibInput(iso);

    // Assert
    expect(input).toBe("2026-11-08T10:30");
  });

  // Edge: crossing midnight forward into the next day.
  it("moves to the next WIB day when UTC is after 17.00", () => {
    // Arrange
    const iso = "2026-12-31T20:00:00Z";

    // Act
    const input = isoToWibInput(iso);

    // Assert
    expect(input).toBe("2027-01-01T03:00");
  });

  // Negative: text that is not a date leaves the field empty instead of showing garbage.
  it("returns an empty string for text that is not a date", () => {
    // Arrange
    const iso = "bukan tanggal";

    // Act
    const input = isoToWibInput(iso);

    // Assert
    expect(input).toBe("");
  });

  // Edge: a value converted forth and back stays the same to the minute.
  it("round-trips with wibInputToIso", () => {
    // Arrange
    const input = "2026-03-09T00:05";

    // Act
    const back = isoToWibInput(wibInputToIso(input) ?? "");

    // Assert
    expect(back).toBe(input);
  });
});

describe("nowWibInput", () => {
  // Positive: the default of "tanggal dan jam jawaban diperoleh" is the current time in WIB.
  it("returns the given moment as a WIB datetime-local value", () => {
    // Arrange
    const now = new Date("2026-11-08T03:30:59Z");

    // Act
    const input = nowWibInput(now);

    // Assert
    expect(input).toBe("2026-11-08T10:30");
  });

  // Edge: without an argument it uses the real clock and still yields a valid picker value.
  it("uses the current time when no moment is given", () => {
    // Arrange
    const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

    // Act
    const input = nowWibInput();

    // Assert
    expect(input).toMatch(pattern);
    expect(wibInputToIso(input)).not.toBeNull();
  });
});
