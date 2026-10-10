import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { canStartNewVersion, isCaseEditable } from "./permissions";

describe("isCaseEditable", () => {
  // Positive: the server accepts a save only for these two statuses.
  it.each(["draft", "needs_revision"] as const)("allows editing a %s case", (status) => {
    // Arrange / Act
    const editable = isCaseEditable(status);

    // Assert
    expect(editable).toBe(true);
  });

  // Negative
  it.each(["in_review", "approved"] as const)("locks a %s case", (status) => {
    // Arrange / Act
    const editable = isCaseEditable(status);

    // Assert
    expect(editable).toBe(false);
  });
});

describe("canStartNewVersion", () => {
  // Positive
  it.each(["author", "admin"] as const)("lets the %s start a version of an approved case", (role) => {
    // Arrange / Act
    const allowed = canStartNewVersion(role, "approved");

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative
  it.each(["reviewer", "viewer"] as const)("does not offer the button to the %s", (role) => {
    // Arrange / Act
    const allowed = canStartNewVersion(role, "approved");

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: only an approved case has a version to copy.
  it.each(["draft", "in_review", "needs_revision"] as const)(
    "does not offer the button on a %s case, even to an admin",
    (status: CaseStatus) => {
      // Arrange / Act
      const allowed = canStartNewVersion("admin", status);

      // Assert
      expect(allowed).toBe(false);
    },
  );

  // Edge: the session is still loading or has ended.
  it("does not offer the button when the role is unknown", () => {
    // Arrange
    const role: Role | null = null;

    // Act
    const allowed = canStartNewVersion(role, "approved");

    // Assert
    expect(allowed).toBe(false);
  });
});
