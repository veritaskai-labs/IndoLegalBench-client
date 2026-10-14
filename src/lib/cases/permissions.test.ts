import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { canReadReviewFeedback, canStartNewVersion, isCaseEditable } from "./permissions";

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
  // Positive: the server lets the creator or an admin start a version.
  it("lets an admin start a version of an approved case, creator or not", () => {
    // Arrange / Act
    const asNonCreator = canStartNewVersion("admin", "approved", false);
    const asCreator = canStartNewVersion("admin", "approved", true);

    // Assert
    expect(asNonCreator).toBe(true);
    expect(asCreator).toBe(true);
  });

  it("lets the author who created the case start a version", () => {
    // Arrange / Act
    const allowed = canStartNewVersion("author", "approved", true);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: another author would only get a 403 from the server.
  it("does not offer the button to an author who did not create the case", () => {
    // Arrange / Act
    const allowed = canStartNewVersion("author", "approved", false);

    // Assert
    expect(allowed).toBe(false);
  });

  it.each(["reviewer", "viewer"] as const)(
    "does not offer the button to the %s, even if the case is theirs",
    (role) => {
      // Arrange / Act
      const allowed = canStartNewVersion(role, "approved", true);

      // Assert
      expect(allowed).toBe(false);
    },
  );

  // Edge: only an approved case has a version to copy.
  it.each(["draft", "in_review", "needs_revision"] as const)(
    "does not offer the button on a %s case, even to an admin",
    (status: CaseStatus) => {
      // Arrange / Act
      const allowed = canStartNewVersion("admin", status, true);

      // Assert
      expect(allowed).toBe(false);
    },
  );

  // Edge: the session is still loading or has ended.
  it("does not offer the button when the role is unknown", () => {
    // Arrange
    const role: Role | null = null;

    // Act
    const allowed = canStartNewVersion(role, "approved", true);

    // Assert
    expect(allowed).toBe(false);
  });
});

describe("canReadReviewFeedback", () => {
  // Positive: the server lets the author who created the case and an admin read the review.
  it("lets an admin read the feedback on a case that needs revision, creator or not", () => {
    // Arrange / Act
    const asNonCreator = canReadReviewFeedback("admin", "needs_revision", false);
    const asCreator = canReadReviewFeedback("admin", "needs_revision", true);

    // Assert
    expect(asNonCreator).toBe(true);
    expect(asCreator).toBe(true);
  });

  it("lets the author who created the case read the feedback", () => {
    // Arrange / Act
    const allowed = canReadReviewFeedback("author", "needs_revision", true);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: the server answers 403 here and a 403 sends the user to /forbidden.
  it("does not let an author who did not create the case read the feedback", () => {
    // Arrange / Act
    const allowed = canReadReviewFeedback("author", "needs_revision", false);

    // Assert
    expect(allowed).toBe(false);
  });

  // Negative
  it.each(["reviewer", "viewer"] as const)("does not show the feedback to the %s role", (role: Role) => {
    // Arrange / Act
    const allowed = canReadReviewFeedback(role, "needs_revision", true);

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: there is feedback to act on only after a revision was asked for.
  it.each(["draft", "in_review", "approved"] as const)(
    "does not show the feedback on a %s case, even to an admin",
    (status: CaseStatus) => {
      // Arrange / Act
      const allowed = canReadReviewFeedback("admin", status, true);

      // Assert
      expect(allowed).toBe(false);
    },
  );

  // Edge: the session is still loading or has ended.
  it("does not show the feedback when the role is unknown", () => {
    // Arrange
    const role: Role | null = null;

    // Act
    const allowed = canReadReviewFeedback(role, "needs_revision", true);

    // Assert
    expect(allowed).toBe(false);
  });
});
