import { describe, expect, it } from "vitest";
import type { Role } from "@/types";
import type { CaseStatus } from "@/types/case";
import { canStartNewVersion, isCaseEditable, canSubmitForReview } from "./permissions";

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

describe("canSubmitForReview", () => {
  // Positive: penulis kasus pada draf.
  it("lets the author who wrote the case submit a draft", () => {
    expect(canSubmitForReview("author", "draft", true)).toBe(true);
  });

  // Positive: setelah reviewer minta revisi, penulis mengajukan ulang.
  it("lets the author submit again after a revision was asked for", () => {
    expect(canSubmitForReview("author", "needs_revision", true)).toBe(true);
  });

  // Negative: author lain, bukan penulis kasus ini.
  it("refuses an author who did not write the case", () => {
    expect(canSubmitForReview("author", "draft", false)).toBe(false);
  });

  // Negative: peran lain tidak mengajukan, termasuk admin.
  it("refuses the other roles", () => {
    expect(canSubmitForReview("admin", "draft", true)).toBe(false);
    expect(canSubmitForReview("reviewer", "draft", true)).toBe(false);
    expect(canSubmitForReview("viewer", "draft", true)).toBe(false);
  });

  // Negative: status yang memang tidak bisa diajukan.
  it("refuses a case that is already in review or approved", () => {
    expect(canSubmitForReview("author", "in_review", true)).toBe(false);
    expect(canSubmitForReview("author", "approved", true)).toBe(false);
  });

  // Corner: sesi belum terbaca.
  it("refuses when the role is not known yet", () => {
    expect(canSubmitForReview(null, "draft", true)).toBe(false);
  });
});
