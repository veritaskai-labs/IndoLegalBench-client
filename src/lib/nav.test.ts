import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import { navForRole } from "./nav";

function labels(role: Role) {
  return navForRole(role).flatMap((group) =>
    group.items.map((item) => item.label),
  );
}

function hrefs(role: Role) {
  return navForRole(role).flatMap((group) =>
    group.items.map((item) => item.href),
  );
}

describe("navForRole", () => {
  // PBI-24 AC6 + AC10: writing work, the review queue and reports in one menu.
  it("gives contributor the writing, review and report pages", () => {
    expect(labels("contributor")).toEqual([
      "Dasbor",
      "Suite dan kasus",
      "Antrean tinjauan",
      "Laporan",
    ]);
  });

  it("gives viewer reports but no admin pages", () => {
    expect(labels("viewer")).toEqual(["Dasbor", "Laporan"]);
  });

  // PBI-11 AC1 & D10: Admin and Developer AI can run automatic measurements.
  it("gives developer AI the suites and execution pages, without the dashboard (PBI-11, SCRUM-184)", () => {
    expect(labels("developer_ai")).toEqual(["Suite dan kasus", "Eksekusi"]);
  });

  it("gives admin the admin pages and reports but not the review queue", () => {
    expect(labels("admin")).toEqual([
      "Dasbor",
      "Suite dan kasus",
      "Penyedia",
      "Eksekusi",
      "Rubrik",
      "Laporan",
      "Anggota",
      "Pemantauan review",
      "Log audit",
    ]);
  });

  it("drops groups left empty for the role", () => {
    expect(navForRole("contributor").map((group) => group.heading)).toEqual([
      "Konteks",
      "Pengukuran",
    ]);
  });

  it("offers the suites page to contributor, admin and developer AI only", () => {
    // Arrange
    const roles = ["contributor", "admin", "viewer", "developer_ai"] as const;

    // Act
    const withSuites = roles.filter((role) => hrefs(role).includes("/suites"));

    // Assert
    expect(withSuites).toEqual(["contributor", "admin", "developer_ai"]);
  });

  // PBI-24 AC10: Contributor and Admin get the Viewer right to read reports.
  it("offers the reports page to admin, contributor and viewer", () => {
    const roles = ["contributor", "admin", "viewer", "developer_ai"] as const;

    const withReports = roles.filter((role) => hrefs(role).includes("/reports"));

    expect(withReports).toEqual(["contributor", "admin", "viewer"]);
  });

  // D10: Admin does not review cases, so the queue is for the contributor only.
  it("offers the review queue to the contributor only", () => {
    expect(hrefs("contributor")).toContain("/reviews");
    expect(hrefs("admin")).not.toContain("/reviews");
    expect(hrefs("viewer")).not.toContain("/reviews");
    expect(hrefs("developer_ai")).not.toContain("/reviews");
  });

  it("offers the review monitoring page to the admin only", () => {
    expect(hrefs("admin")).toContain("/admin/reviews");
    expect(hrefs("contributor")).not.toContain("/admin/reviews");
    expect(hrefs("viewer")).not.toContain("/admin/reviews");
  });

  // PBI-11 AC1 & D10: Admin and Developer AI can run automatic measurements.
  it("offers the execution page to admin and developer AI only", () => {
    const roles = ["contributor", "admin", "viewer", "developer_ai"] as const;
    const withRuns = roles.filter((role) => hrefs(role).includes("/runs"));
    expect(withRuns).toEqual(["admin", "developer_ai"]);
  });

  // PBI-14 AC7: the rubric versions are typed and kept by the Admin.
  it("offers the rubric page to the admin only", () => {
    // Arrange
    const roles = ["contributor", "admin", "viewer", "developer_ai"] as const;

    // Act
    const withRubrics = roles.filter((role) => hrefs(role).includes("/admin/rubrics"));

    // Assert
    expect(withRubrics).toEqual(["admin"]);
  });
});
