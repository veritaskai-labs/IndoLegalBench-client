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
    expect(labels("reviewer")).toEqual(["Dasbor", "Antrean tinjauan"]);
  });

  it("gives viewer reports but no admin pages", () => {
    expect(labels("viewer")).toEqual(["Dasbor", "Laporan"]);
  });

  it("gives developer AI only the suites page, without the dashboard (SCRUM-184)", () => {
    expect(labels("developer_ai")).toEqual(["Suite dan kasus"]);
  });

  it("gives admin every page", () => {
    expect(labels("admin")).toHaveLength(9);
  });

  it("drops groups left empty for the role", () => {
    expect(navForRole("author").map((group) => group.heading)).toEqual([
      "Konteks",
    ]);
  });
  it("offers the suites page to author, admin and developer AI only", () => {
    // Arrange
    const hrefs = (role: Role) =>
      navForRole(role).flatMap((group) => group.items.map((item) => item.href));

    // Act
    const withSuites = (
      ["author", "reviewer", "admin", "viewer", "developer_ai"] as const
    ).filter((role) =>
      hrefs(role).includes("/suites"),
    );

    // Assert
    expect(withSuites).toEqual(["author", "admin", "developer_ai"]);
  });

  it("offers the review monitoring page to the admin only", () => {
    const hrefs = (role: Role) =>
      navForRole(role).flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs("admin")).toContain("/admin/reviews");
    expect(hrefs("reviewer")).not.toContain("/admin/reviews");
    expect(hrefs("author")).not.toContain("/admin/reviews");
    expect(hrefs("viewer")).not.toContain("/admin/reviews");
  });
});