import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_STATUS_LABEL,
  ROUND_DECISION_LABEL,
  ROUND_STATUS_LABEL,
  VERDICT_DECISION_LABEL,
  assignmentStatusLabel,
  blockerMessage,
  newVersionLabel,
  roundDecisionLabel,
  roundOutcomeLabel,
  roundStatusLabel,
  verdictDecisionLabel,
  verdictFormLabel,
  verdictHint,
  verdictLabel,
} from "./reviewLabels";


import type { AssignmentStatus, RoundStatus } from "@/types/reviewAdmin";


const ROUND_STATUSES: RoundStatus[] = [
  "awaiting_assignment",
  "open",
  "decided",
];

const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "active",
  "replaced",
  "void",
];

describe("ROUND_STATUS_LABEL", () => {
  // Positif
  it("names the queue status the admin sees", () => {
    expect(ROUND_STATUS_LABEL.awaiting_assignment).toBe("Menunggu penugasan");
    expect(ROUND_STATUS_LABEL.open).toBe("Sedang dinilai");
    expect(ROUND_STATUS_LABEL.decided).toBe("Sudah diputuskan");
  });

  // corner
  it("leaves no round status without a label", () => {
    for (const status of ROUND_STATUSES) {
      expect(ROUND_STATUS_LABEL[status]).not.toBe("");
    }
  });
});

describe("ASSIGNMENT_STATUS_LABEL", () => {
  // Positif
  it("names the assignment status", () => {
    expect(ASSIGNMENT_STATUS_LABEL.active).toBe("Aktif");
    expect(ASSIGNMENT_STATUS_LABEL.replaced).toBe("Diganti");
    expect(ASSIGNMENT_STATUS_LABEL.void).toBe("Dibatalkan");
  });

  // corner
  it("leaves no assignment status without a label", () => {
    for (const status of ASSIGNMENT_STATUSES) {
      expect(ASSIGNMENT_STATUS_LABEL[status]).not.toBe("");
    }
  });
});

describe("VERDICT_DECISION_LABEL", () => {
  // Positif
  it("names what one reviewer decided", () => {
    expect(VERDICT_DECISION_LABEL.approve).toBe("Setuju");
    expect(VERDICT_DECISION_LABEL.revise).toBe("Minta revisi");
  });
});

describe("ROUND_DECISION_LABEL", () => {
  // Positif
  it("names what the round decided", () => {
    expect(ROUND_DECISION_LABEL.approved).toBe("Disetujui");
    expect(ROUND_DECISION_LABEL.revise).toBe("Perlu revisi");
  });
});

describe("verdictLabel", () => {
  // Positif
  it("names the decision once the reviewer has judged", () => {
    expect(
      verdictLabel({
        decision: "approve",
        comment: null,
        submitted_at: "2026-10-16T03:00:00Z",
      }),
    ).toBe("Setuju");
  });

  // Negatif
  it("says not yet when there is no verdict", () => {
    expect(verdictLabel(null)).toBe("Belum menilai");
  });
});
describe("newVersionLabel", () => {
  // Positif (F-02): Admin tahu yang dinilai versi baru, bukan kasus baru.
  it("names the version in review and says the approved one still holds", () => {
    expect(newVersionLabel(2)).toBe("Versi 2 · versi yang disetujui tetap berlaku");
  });

  // Negatif: kasus yang baru pertama kali direview tidak diberi penanda.
  it("gives no label to a case in its first review", () => {
    expect(newVersionLabel(null)).toBeNull();
  });
});

describe("review labels in English", () => {
  it("names verdicts, statuses, and blockers in English", () => {
    expect(verdictFormLabel("approve", "en")).toBe("Defensible as written");
    expect(verdictFormLabel("revise", "en")).toBe("Needs revision");
    expect(verdictHint("approve", "en")).toBe("I am willing to defend this reference before other advocates.");
    expect(verdictHint("revise", "en")).toBe("Sends the case back to the author with your comment.");
    expect(roundOutcomeLabel("approved", "en")).toBe("Case approved");
    expect(roundOutcomeLabel("revise", "en")).toBe("Case returned to the author for revision");
    expect(blockerMessage("not_reviewer", "en")).toBe("This page is for the assigned reviewer");
    expect(blockerMessage("is_author", "en")).toBe("You cannot review a case you wrote.");
    expect(roundStatusLabel("awaiting_assignment", "en")).toBe("Awaiting assignment");
    expect(roundStatusLabel("open", "en")).toBe("Under review");
    expect(roundStatusLabel("decided", "en")).toBe("Decided");
    expect(assignmentStatusLabel("active", "en")).toBe("Active");
    expect(assignmentStatusLabel("replaced", "en")).toBe("Replaced");
    expect(assignmentStatusLabel("void", "en")).toBe("Voided");
    expect(verdictDecisionLabel("approve", "en")).toBe("Approve");
    expect(verdictDecisionLabel("revise", "en")).toBe("Request revision");
    expect(roundDecisionLabel("approved", "en")).toBe("Approved");
    expect(roundDecisionLabel("revise", "en")).toBe("Needs revision");
  });

  it("says a missing verdict has not been reviewed yet", () => {
    expect(verdictLabel(null, "en")).toBe("Not yet reviewed");
    expect(
      verdictLabel(
        { decision: "approve", comment: null, submitted_at: "2026-10-16T03:00:00Z" },
        "en",
      ),
    ).toBe("Approve");
  });

  it("names a new version while the approved one still applies", () => {
    expect(newVersionLabel(2, "en")).toBe("Version 2 · the approved version still applies");
    expect(newVersionLabel(null, "en")).toBeNull();
  });
});
