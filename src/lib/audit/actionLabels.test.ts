import { describe, expect, it } from "vitest";
import { ACTION_LABEL, auditActionLabel } from "./actionLabels";

// Every action the server writes today (app/modules/audit/trackers.py, catalog D6a).
const SERVER_ACTIONS = [
  "suite.created",
  "suite.updated",
  "suite.deleted",
  "suite.archived",
  "suite.unarchived",
  "suite.snapshot_created",
  "case.created",
  "case.updated",
  "case.version_created",
  "case.tag_changed",
  "case.submitted",
  "case.approved",
  "case.revision_requested",
  "case.status_changed",
  "review.reviewer_assigned",
  "review.reviewer_replaced",
  "review.assignment_voided",
  "review.verdict_submitted",
  "review.approval_carried",
  "ai_product.registered",
  "ai_product.updated",
  "ai_product.deleted",
  "ai_product.activated",
  "ai_product.deactivated",
  "ai_product.credential_rotated",
  "user.added",
  "user.role_changed",
  "user.activated",
  "user.deactivated",
];

describe("auditActionLabel", () => {
  // Positive
  it("reads a submitted case in Indonesian", () => {
    expect(auditActionLabel("case.submitted")).toBe("Kasus diajukan review");
  });

  // Positive
  it("reads a replaced reviewer in Indonesian", () => {
    expect(auditActionLabel("review.reviewer_replaced")).toBe("Reviewer diganti");
  });

  // Positive
  it.each(SERVER_ACTIONS)("has a readable label for %s", (action) => {
    const label = auditActionLabel(action);
    expect(label).not.toBe(action);
    expect(label).not.toMatch(/[._]/);
  });

  // Positive: no label for a code the server never writes.
  it("lists exactly the actions the server writes", () => {
    expect(Object.keys(ACTION_LABEL).sort()).toEqual([...SERVER_ACTIONS].sort());
  });

  // Negative
  it("shows the raw code when the server sends an action it does not know", () => {
    expect(auditActionLabel("measurement.started")).toBe("measurement.started");
  });

  // Corner
  it("keeps an empty action empty", () => {
    expect(auditActionLabel("")).toBe("");
  });

  // Corner: names on Object.prototype are not labels.
  it.each(["constructor", "toString", "__proto__"])("does not treat %s as a known action", (code) => {
    expect(auditActionLabel(code)).toBe(code);
  });

  // Corner: codes are matched exactly.
  it("does not match a code with different case or spaces", () => {
    expect(auditActionLabel("Case.Submitted")).toBe("Case.Submitted");
    expect(auditActionLabel(" case.submitted ")).toBe(" case.submitted ");
  });
});
