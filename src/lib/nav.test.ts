import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import { navForRole } from "./nav";

function labels(role: Role) {
  return navForRole(role).flatMap((group) =>
    group.items.map((item) => item.label),
  );
}

describe("navForRole", () => {
  it("gives author only the shared pages", () => {
    expect(labels("author")).toEqual(["Dasbor", "Suite dan kasus"]);
  });

  it("adds the review queue for reviewer", () => {
    expect(labels("reviewer")).toEqual([
      "Dasbor",
      "Suite dan kasus",
      "Antrean tinjauan",
    ]);
  });

  it("gives viewer reports but no admin pages", () => {
    expect(labels("viewer")).toEqual(["Dasbor", "Suite dan kasus", "Laporan"]);
  });

  it("gives admin every page", () => {
    expect(labels("admin")).toHaveLength(8);
  });

  it("drops groups left empty for the role", () => {
    expect(navForRole("author").map((group) => group.heading)).toEqual([
      "Konteks",
    ]);
  });
});