import { describe, expect, it } from "vitest";
import {
  buildVerdictBody,
  canSubmitVerdict,
  otherReviewerIsBlind,
  reviewBlocker,
} from "./verdictRules";

const REVIEWER_ID = "11111111-1111-1111-1111-111111111111";
const AUTHOR_ID = "22222222-2222-2222-2222-222222222222";

describe("reviewBlocker", () => {
  // Positive
  it("lets a reviewer who did not write the case review it", () => {
    // Arrange
    const user = { id: REVIEWER_ID, role: "reviewer" } as const;

    // Act
    const blocker = reviewBlocker(user, AUTHOR_ID);

    // Assert
    expect(blocker).toBeNull();
  });

  // Negative: the server answers 403 here, which sends the user to /forbidden.
  it("blocks a reviewer who wrote the case", () => {
    // Arrange
    const user = { id: AUTHOR_ID, role: "reviewer" } as const;

    // Act
    const blocker = reviewBlocker(user, AUTHOR_ID);

    // Assert
    expect(blocker).toBe("is_author");
  });

  // Negative
  it.each(["admin", "author", "viewer"] as const)("blocks the %s role from reviewing", (role) => {
    // Arrange
    const user = { id: REVIEWER_ID, role };

    // Act
    const blocker = reviewBlocker(user, AUTHOR_ID);

    // Assert
    expect(blocker).toBe("not_reviewer");
  });

  // Edge: the role is checked before the author, so an admin who wrote the case is not told "is_author".
  it("reports the role first when a non-reviewer is also the author", () => {
    // Arrange
    const user = { id: AUTHOR_ID, role: "admin" } as const;

    // Act
    const blocker = reviewBlocker(user, AUTHOR_ID);

    // Assert
    expect(blocker).toBe("not_reviewer");
  });
});

describe("canSubmitVerdict", () => {
  // Negative: nothing chosen yet.
  it("is false until a decision is picked", () => {
    // Arrange
    const comment = "Sudah saya cek";

    // Act
    const allowed = canSubmitVerdict(null, comment);

    // Assert
    expect(allowed).toBe(false);
  });

  // Positive: the comment is optional when approving.
  it.each(["", "   ", "Sesuai"])("is true for an approval with comment %j", (comment) => {
    // Arrange
    const decision = "approve";

    // Act
    const allowed = canSubmitVerdict(decision, comment);

    // Assert
    expect(allowed).toBe(true);
  });

  // Positive
  it("is true for a revision that has a comment", () => {
    // Arrange
    const comment = "Pasal 151 salah";

    // Act
    const allowed = canSubmitVerdict("revise", comment);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative + edge: whitespace is not a comment.
  it.each(["", " ", "\n\t  "])("is false for a revision with comment %j", (comment) => {
    // Arrange
    const decision = "revise";

    // Act
    const allowed = canSubmitVerdict(decision, comment);

    // Assert
    expect(allowed).toBe(false);
  });
});

describe("buildVerdictBody", () => {
  // Positive
  it("keeps the decision and the comment", () => {
    // Arrange
    const comment = "Pasal 151 salah";

    // Act
    const body = buildVerdictBody("revise", comment);

    // Assert
    expect(body).toEqual({ decision: "revise", comment: "Pasal 151 salah" });
  });

  // Edge: the server strips the comment too, so the stored text matches what the reviewer sees.
  it("trims the comment", () => {
    // Arrange
    const comment = "  Pasal salah \n";

    // Act
    const body = buildVerdictBody("revise", comment);

    // Assert
    expect(body.comment).toBe("Pasal salah");
  });

  // Edge
  it.each(["", "   ", "\n"])("sends a null comment when the text is %j", (comment) => {
    // Arrange
    const decision = "approve";

    // Act
    const body = buildVerdictBody(decision, comment);

    // Assert
    expect(body).toEqual({ decision: "approve", comment: null });
  });

  // Edge: line breaks inside the comment are kept.
  it("keeps line breaks inside the comment", () => {
    // Arrange
    const comment = "Baris satu\nBaris dua";

    // Act
    const body = buildVerdictBody("revise", comment);

    // Assert
    expect(body.comment).toBe("Baris satu\nBaris dua");
  });
});

describe("otherReviewerIsBlind", () => {
  const verdict = { decision: "approve", comment: null, submitted_at: "2026-10-14T10:00:00Z" } as const;

  // Positive: the server hides the verdict while the round is open.
  it.each(["open", "awaiting_assignment"] as const)(
    "is true when the verdict is hidden and the round is %s",
    (roundStatus) => {
      // Arrange
      const slot = { verdict: null };

      // Act
      const blind = otherReviewerIsBlind(slot, roundStatus);

      // Assert
      expect(blind).toBe(true);
    },
  );

  // Negative: an admin gets the verdict at any time.
  it("is false when the verdict is present even though the round is open", () => {
    // Arrange
    const slot = { verdict };

    // Act
    const blind = otherReviewerIsBlind(slot, "open");

    // Assert
    expect(blind).toBe(false);
  });

  // Negative: nothing is blind once the round is decided.
  it.each([null, verdict])("is false when the round is decided and the verdict is %j", (value) => {
    // Arrange
    const slot = { verdict: value };

    // Act
    const blind = otherReviewerIsBlind(slot, "decided");

    // Assert
    expect(blind).toBe(false);
  });
});
