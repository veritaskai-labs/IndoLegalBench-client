import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import {
  canCreateCase,
  canReadReviewFeedback,
  canStartNewVersion,
  canSubmitForReview,
  isAdminOrCreator,
  isCaseEditable,
} from "./permissions";

describe("isCaseEditable", () => {
  // Positive: the server accepts a save only for these two statuses.
  it.each(["draft", "needs_revision"] as const)(
    "allows editing a %s case",
    (status) => {
      // Arrange / Act
      const editable = isCaseEditable(status);

      // Assert
      expect(editable).toBe(true);
    },
  );

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
    const allowed = canStartNewVersion("contributor", "approved", true);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: another author would only get a 403 from the server.
  it("does not offer the button to an author who did not create the case", () => {
    // Arrange / Act
    const allowed = canStartNewVersion("contributor", "approved", false);

    // Assert
    expect(allowed).toBe(false);
  });

  it.each(["viewer"] as const)(
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
  // Positive: the author and the assigned reviewers are Contributors, and the client cannot tell which
  // case they belong to, so every Contributor and the admin may ask. The server decides.
  it.each(["admin", "contributor"] as const)("offers the feedback to the %s role on every status", (role: Role) => {
    // Arrange
    const statuses: CaseStatus[] = ["draft", "in_review", "needs_revision", "approved"];

    // Act
    const allowed = statuses.map((status) => canReadReviewFeedback(role, status));

    // Assert
    expect(allowed).toEqual([true, true, true, true]);
  });

  // Negative: the server answers 403 to these roles.
  it.each(["viewer", "developer_ai"] as const)("does not show the feedback to the %s role", (role: Role) => {
    // Arrange / Act
    const allowed = canReadReviewFeedback(role, "needs_revision");

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: the session is still loading or has ended.
  it("does not show the feedback when the role is unknown", () => {
    // Arrange
    const role: Role | null = null;

    // Act
    const allowed = canReadReviewFeedback(role, "needs_revision");

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: the case is still loading.
  it("does not show the feedback while the case status is unknown", () => {
    // Arrange / Act
    const allowed = canReadReviewFeedback("admin", null);

    // Assert
    expect(allowed).toBe(false);
  });
});

describe("isAdminOrCreator", () => {
  // Positive
  it("is true for an admin, creator or not", () => {
    // Arrange / Act
    const asNonCreator = isAdminOrCreator("admin", false);
    const asCreator = isAdminOrCreator("admin", true);

    // Assert
    expect(asNonCreator).toBe(true);
    expect(asCreator).toBe(true);
  });

  it("is true for the author who created the case", () => {
    // Arrange / Act
    const allowed = isAdminOrCreator("contributor", true);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative
  it("is false for an author who did not create the case", () => {
    // Arrange / Act
    const allowed = isAdminOrCreator("contributor", false);

    // Assert
    expect(allowed).toBe(false);
  });

  // Negative: being the creator means nothing for a role that is not an author.
  it.each(["viewer"] as const)("is false for the %s role even when marked as creator", (role: Role) => {
    // Arrange / Act
    const allowed = isAdminOrCreator(role, true);

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: the session is still loading or has ended.
  it("is false when the role is unknown", () => {
    // Arrange
    const role: Role | null = null;

    // Act
    const allowed = isAdminOrCreator(role, true);

    // Assert
    expect(allowed).toBe(false);
  });
});

describe("canSubmitForReview", () => {
  // Positive: penulis kasus pada draf.
  it("lets the author who wrote the case submit a draft", () => {
    expect(canSubmitForReview("contributor", "draft", true)).toBe(true);
  });

  // Positive: setelah reviewer minta revisi, penulis mengajukan ulang.
  it("lets the author submit again after a revision was asked for", () => {
    expect(canSubmitForReview("contributor", "needs_revision", true)).toBe(true);
  });

  // Negative: author lain, bukan penulis kasus ini.
  it("refuses an author who did not write the case", () => {
    expect(canSubmitForReview("contributor", "draft", false)).toBe(false);
  });

  // Negative: peran lain tidak mengajukan, termasuk admin.
  it("refuses the other roles", () => {
    expect(canSubmitForReview("admin", "draft", true)).toBe(false);
    expect(canSubmitForReview("developer_ai", "draft", true)).toBe(false);
    expect(canSubmitForReview("viewer", "draft", true)).toBe(false);
  });

  // Negative: status yang memang tidak bisa diajukan.
  it("refuses a case that is already in review or approved", () => {
    expect(canSubmitForReview("contributor", "in_review", true)).toBe(false);
    expect(canSubmitForReview("contributor", "approved", true)).toBe(false);
  });

  // Corner: sesi belum terbaca.
  it("refuses when the role is not known yet", () => {
    expect(canSubmitForReview(null, "draft", true)).toBe(false);
  });
});

describe("canCreateCase", () => {
  // Positive: PBI-24 AC2, the contributor holds every writing right of the former author.
  it.each(["contributor", "admin"] as const)("lets the %s role start a case", (role: Role) => {
    // Arrange / Act
    const allowed = canCreateCase(role);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: the server answers 403 to every other role.
  it.each(["viewer", "developer_ai"] as const)("does not let the %s role start a case", (role: Role) => {
    // Arrange / Act
    const allowed = canCreateCase(role);

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: the session is still loading or has ended.
  it("does not let an unknown role start a case", () => {
    // Arrange
    const role: Role | null = null;

    // Act
    const allowed = canCreateCase(role);

    // Assert
    expect(allowed).toBe(false);
  });
});
