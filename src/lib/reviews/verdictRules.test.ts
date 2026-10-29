import { describe, expect, it } from "vitest";
import { makeSlot, makeVerdictResult, makeVerdictView } from "@/test/reviewFixtures";
import {
  buildVerdictBody,
  canSubmitVerdict,
  isReviewerRole,
  otherReviewerIsBlind,
  reviewBlocker,
  revisionRequestsFirst,
  submittedVerdict,
} from "./verdictRules";

const REVIEWER_ID = "11111111-1111-1111-1111-111111111111";
const AUTHOR_ID = "22222222-2222-2222-2222-222222222222";

describe("reviewBlocker", () => {
  // Positive
  it("lets a reviewer who did not write the case review it", () => {
    // Arrange
    const user = { id: REVIEWER_ID, role: "contributor" } as const;

    // Act
    const blocker = reviewBlocker(user, AUTHOR_ID);

    // Assert
    expect(blocker).toBeNull();
  });

  // Negative: the server answers 403 here, which sends the user to /forbidden.
  it("blocks a reviewer who wrote the case", () => {
    // Arrange
    const user = { id: AUTHOR_ID, role: "contributor" } as const;

    // Act
    const blocker = reviewBlocker(user, AUTHOR_ID);

    // Assert
    expect(blocker).toBe("is_author");
  });

  // Edge: PBI-24 AC2, one account both writes and reviews. The block follows the case, not the role.
  it("lets the same contributor review another case but not the one they wrote", () => {
    // Arrange
    const me = { id: REVIEWER_ID, role: "contributor" } as const;
    const caseWrittenByMe = REVIEWER_ID;
    const caseWrittenBySomeoneElse = AUTHOR_ID;

    // Act
    const ownCase = reviewBlocker(me, caseWrittenByMe);
    const otherCase = reviewBlocker(me, caseWrittenBySomeoneElse);

    // Assert
    expect(ownCase).toBe("is_author");
    expect(otherCase).toBeNull();
  });

  // Negative
  it.each(["admin", "viewer", "developer_ai"] as const)("blocks the %s role from reviewing", (role) => {
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

describe("submittedVerdict", () => {
  // Positive: the reply to the send is newer than the queue the page was opened from.
  it("prefers the result of the send over the verdict in the queue", () => {
    // Arrange
    const result = makeVerdictResult({
      decision: "revise",
      comment: "Pasal salah",
      submitted_at: "2026-10-14T05:00:00Z",
    });
    const fromQueue = makeVerdictView({ decision: "approve", comment: null });

    // Act
    const shown = submittedVerdict(result, fromQueue);

    // Assert
    expect(shown).toEqual({
      decision: "revise",
      comment: "Pasal salah",
      submitted_at: "2026-10-14T05:00:00Z",
    });
  });

  // Positive: a verdict sent earlier still shows when the page is opened again.
  it("falls back to the verdict the queue already holds", () => {
    // Arrange
    const fromQueue = makeVerdictView({ decision: "approve", comment: "Sesuai" });

    // Act
    const shown = submittedVerdict(null, fromQueue);

    // Assert
    expect(shown).toBe(fromQueue);
  });

  // Negative: nothing sent yet, so the form stays.
  it("is null when nothing was sent", () => {
    // Arrange / Act
    const shown = submittedVerdict(null, null);

    // Assert
    expect(shown).toBeNull();
  });

  // Edge: the round fields of the result belong to the round, not to the verdict.
  it("keeps only the decision, comment and time of the result", () => {
    // Arrange
    const result = makeVerdictResult({ round_status: "decided", round_decision: "approved" });

    // Act
    const shown = submittedVerdict(result, null);

    // Assert
    expect(Object.keys(shown ?? {}).sort()).toEqual(["comment", "decision", "submitted_at"]);
  });
});

describe("isReviewerRole", () => {
  // Positive
  it("is true for the contributor role", () => {
    // Arrange / Act
    const result = isReviewerRole("contributor");

    // Assert
    expect(result).toBe(true);
  });

  // Negative: the server answers 403 to every other role.
  it.each(["admin", "viewer", "developer_ai"] as const)("is false for the %s role", (role) => {
    // Arrange / Act
    const result = isReviewerRole(role);

    // Assert
    expect(result).toBe(false);
  });

  // Edge: no session yet.
  it("is false while there is no session", () => {
    // Arrange / Act
    const result = isReviewerRole(null);

    // Assert
    expect(result).toBe(false);
  });
});

describe("revisionRequestsFirst", () => {
  const revise = makeSlot({
    assignment_id: "r",
    reviewer: { id: "r", name: "Revisi" },
    verdict: makeVerdictView({ decision: "revise", comment: "Perbaiki" }),
  });
  const approve = makeSlot({
    assignment_id: "a",
    reviewer: { id: "a", name: "Setuju" },
    verdict: makeVerdictView({ decision: "approve" }),
  });
  const pending = makeSlot({ assignment_id: "p", reviewer: { id: "p", name: "Belum" }, verdict: null });

  // Positive: the author acts on a revision request, so it comes first.
  it("puts the revision requests first, then the approvals, then the reviewers with no verdict", () => {
    // Arrange
    const slots = [pending, approve, revise];

    // Act
    const sorted = revisionRequestsFirst(slots);

    // Assert
    expect(sorted.map((slot) => slot.reviewer.name)).toEqual(["Revisi", "Setuju", "Belum"]);
  });

  // Edge: reviewers in the same group keep the order the server sent.
  it("keeps the server's order inside a group", () => {
    // Arrange
    const second = makeSlot({
      assignment_id: "r2",
      reviewer: { id: "r2", name: "Revisi kedua" },
      verdict: makeVerdictView({ decision: "revise", comment: "Juga" }),
    });

    // Act
    const sorted = revisionRequestsFirst([revise, approve, second]);

    // Assert
    expect(sorted.map((slot) => slot.reviewer.name)).toEqual(["Revisi", "Revisi kedua", "Setuju"]);
  });

  // Edge: the list that came from the server is not changed.
  it("does not change the list it was given", () => {
    // Arrange
    const slots = [approve, revise];

    // Act
    revisionRequestsFirst(slots);

    // Assert
    expect(slots.map((slot) => slot.reviewer.name)).toEqual(["Setuju", "Revisi"]);
  });

  // Edge
  it("returns an empty list for no reviewers", () => {
    // Arrange / Act
    const sorted = revisionRequestsFirst([]);

    // Assert
    expect(sorted).toEqual([]);
  });
});
