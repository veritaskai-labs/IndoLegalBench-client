import { describe, expect, it } from "vitest";
import { formatWib } from "./formatWib";

describe("formatWib", () => {
  // Positive
  it("shifts a UTC timestamp to WIB", () => {
    expect(formatWib("2026-10-06T03:30:00Z")).toBe("6 Okt 2026, 10:30 WIB");
  });

  // Corner
  it("moves to the next day when UTC is late in the evening", () => {
    expect(formatWib("2026-10-06T18:00:00Z")).toBe("7 Okt 2026, 01:00 WIB");
  });

  // Corner
  it("keeps midnight WIB on the right day", () => {
    expect(formatWib("2026-10-05T17:00:00Z")).toBe("6 Okt 2026, 00:00 WIB");
  });

  // Corner
  it("pads single digit hours and minutes", () => {
    expect(formatWib("2026-10-06T00:05:00Z")).toBe("6 Okt 2026, 07:05 WIB");
  });

  // Negative
  it("returns a dash when the timestamp cannot be read", () => {
    expect(formatWib("not a date")).toBe("—");
  });
});