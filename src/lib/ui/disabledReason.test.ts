import { describe, expect, it } from "vitest";
import { missingRequirementsText } from "./disabledReason";

describe("missingRequirementsText", () => {
  it("returns null when every requirement is met", () => {
    expect(missingRequirementsText([["label sesi", true], ["produk AI", true]])).toBeNull();
  });

  it("names a single missing requirement", () => {
    expect(missingRequirementsText([["label sesi", true], ["produk AI", false]])).toBe("Lengkapi dulu: produk AI.");
  });

  it("joins two missing requirements with dan", () => {
    expect(missingRequirementsText([["label sesi", false], ["produk AI", false]])).toBe(
      "Lengkapi dulu: label sesi dan produk AI.",
    );
  });

  it("lists three or more missing requirements in their given order", () => {
    expect(
      missingRequirementsText([
        ["label sesi", false],
        ["tujuan sesi", false],
        ["minimal satu suite", true],
        ["produk AI", false],
      ]),
    ).toBe("Lengkapi dulu: label sesi, tujuan sesi, dan produk AI.");
  });
});
