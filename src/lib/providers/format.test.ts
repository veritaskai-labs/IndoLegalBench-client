import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatRupiah,
  formatRupiahDown,
  formatRupiahInput,
  parseRupiahInput,
} from "./format";

// Intl puts a non-breaking space between "Rp" and the number; compare on plain spaces.
const plain = (text: string) => text.replaceAll(" ", " ");

describe("formatRupiahDown (remaining budget, PO decision 3 Nov)", () => {
  // The remaining budget decides whether a product may still be used, so the screen never
  // shows more than is left. The server keeps the cents; only the display drops them.
  it.each([
    ["374999.50", "Rp 374.999"],
    ["0.50", "Rp 0"],
    ["0.99", "Rp 0"],
    ["0", "Rp 0"],
    ["0.00", "Rp 0"],
    ["1500000.00", "Rp 1.500.000"],
    ["250000", "Rp 250.000"],
  ])("shows %s as %s", (value, shown) => {
    expect(plain(formatRupiahDown(value))).toBe(shown);
  });

  // The server clamps at 0 (server#91), but a negative value still rounds away from zero.
  it.each([
    ["-0.50", "-Rp 1"],
    ["-1.00", "-Rp 1"],
    ["-1.01", "-Rp 2"],
  ])("rounds the negative %s down to %s", (value, shown) => {
    expect(plain(formatRupiahDown(value))).toBe(shown);
  });

  // Numeric(18,2) holds values above 2^53, where Number() would already be off by one.
  it("keeps every digit of a value that a float cannot hold", () => {
    expect(plain(formatRupiahDown("9007199254740993.99"))).toBe("Rp 9.007.199.254.740.993");
  });

  it("returns text that is not a decimal unchanged instead of Rp NaN", () => {
    expect(formatRupiahDown("abc")).toBe("abc");
    expect(formatRupiahDown("1.2.3")).toBe("1.2.3");
    expect(formatRupiahDown("")).toBe("");
  });
});

describe("formatRupiah", () => {
  it("formats a Decimal string and a number the same way", () => {
    expect(plain(formatRupiah("1500000.00"))).toBe("Rp 1.500.000");
    expect(plain(formatRupiah(1500000))).toBe("Rp 1.500.000");
  });

  it("returns a value it cannot read unchanged", () => {
    expect(formatRupiah("abc")).toBe("abc");
  });
});

describe("parseRupiahInput and formatRupiahInput", () => {
  it("reads the digits of a typed budget", () => {
    expect(parseRupiahInput("Rp 1.500.000")).toBe(1500000);
    expect(parseRupiahInput("")).toBeNull();
    expect(parseRupiahInput("Rp")).toBeNull();
  });

  it("puts thousand dots in a typed budget and keeps an empty field empty", () => {
    expect(formatRupiahInput("1500000")).toBe("1.500.000");
    expect(formatRupiahInput("")).toBe("");
  });
});

describe("formatDate and formatDateTime", () => {
  it("formats an ISO time in Indonesian", () => {
    expect(formatDate("2026-09-29T01:00:00Z")).toMatch(/29 Sep 2026/);
    expect(formatDateTime("2026-09-29T01:00:00Z")).toMatch(/29 Sep 2026/);
  });

  it("returns a value that is not a date unchanged", () => {
    expect(formatDate("kemarin")).toBe("kemarin");
    expect(formatDateTime("kemarin")).toBe("kemarin");
  });
});
