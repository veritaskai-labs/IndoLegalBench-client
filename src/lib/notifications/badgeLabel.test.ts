import { describe, expect, it } from "vitest";
import { badgeLabel } from "./badgeLabel";

describe("badgeLabel", () => {
  describe("tidak ada yang belum dibaca", () => {
    it("shows no badge for 0", () => {
      expect(badgeLabel(0)).toBeNull();
    });
  });

  describe("1 sampai 99", () => {
    it.each([
      [1, "1"],
      [42, "42"],
      [99, "99"],
    ])("shows %i as is", (count, label) => {
      expect(badgeLabel(count)).toBe(label);
    });
  });

  describe("di atas 99", () => {
    it.each([100, 1000])("caps %i at 99+", (count) => {
      expect(badgeLabel(count)).toBe("99+");
    });
  });
});
