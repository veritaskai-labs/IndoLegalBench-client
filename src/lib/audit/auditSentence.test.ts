import { describe, expect, it } from "vitest";
import type { AuditEntry } from "@/types/audit";
import { KNOWN_AUDIT_ACTIONS, auditActionSentence, auditObjectLabel } from "./auditSentence";

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    occurred_at: "2026-10-06T03:30:00Z",
    actor_user_id: "u1",
    actor_name: "Contoh",
    actor_email: "contoh@veritask.test",
    actor_role: "author",
    action: "case.updated",
    entity_type: "case",
    entity_id: "c1",
    entity_label: "ILB-PT-0142",
    case_id: "c1",
    before: null,
    after: null,
    reason: null,
    request_id: null,
    ...overrides,
  };
}

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
  "review.comment_replied",
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

describe("auditActionSentence", () => {
  // K-07: the example from the UAT feedback.
  it("reads a reviewer replaced by an admin as a sentence with the actor's role", () => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ actor_role: "admin", action: "review.reviewer_replaced" }));

    // Assert
    expect(sentence).toBe("Admin mengganti Reviewer");
  });

  // Positive: one sentence per role.
  it.each([
    ["author", "case.submitted", "Author mengajukan kasus untuk review"],
    ["reviewer", "review.verdict_submitted", "Reviewer mengirim penilaian"],
    ["admin", "user.deactivated", "Admin menonaktifkan pengguna"],
    ["viewer", "case.updated", "Viewer mengubah kasus"],
  ])("starts with the %s role", (role, action, expected) => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ actor_role: role, action }));

    // Assert
    expect(sentence).toBe(expected);
  });

  // Positive: every action the server writes has a sentence, so no raw code shows today.
  it.each(SERVER_ACTIONS)("has a sentence for %s without the raw code", (action) => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ actor_role: "admin", action }));

    // Assert
    expect(sentence).not.toBe(action);
    expect(sentence).not.toContain(".");
  });

  // Corner: the server attributes automatic results to whoever sent the request, so naming that
  // person would be wrong. These read as passive results without a role.
  it.each([
    ["reviewer", "case.approved", "Kasus disetujui"],
    ["reviewer", "case.revision_requested", "Kasus diminta revisi"],
    ["reviewer", "case.status_changed", "Status kasus berubah"],
    ["author", "review.approval_carried", "Persetujuan Reviewer dibawa ke ronde berikutnya"],
    ["admin", "review.assignment_voided", "Penugasan Reviewer dibatalkan"],
  ])("reads an automatic result without the role (%s, %s)", (role, action, expected) => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ actor_role: role, action }));

    // Assert
    expect(sentence).toBe(expected);
  });

  // Corner: on submit the system picks the reviewers, not the author who submitted.
  it("reads a reviewer assigned by the system as automatic", () => {
    // Arrange / Act
    const sentence = auditActionSentence(
      entry({ action: "review.reviewer_assigned", after: { reviewer_id: "r1", source: "system" } }),
    );

    // Assert
    expect(sentence).toBe("Reviewer ditugaskan otomatis");
  });

  it("reads a reviewer assigned by an admin with the admin as actor", () => {
    // Arrange / Act
    const sentence = auditActionSentence(
      entry({
        actor_role: "admin",
        action: "review.reviewer_assigned",
        after: { reviewer_id: "r1", source: "admin" },
      }),
    );

    // Assert
    expect(sentence).toBe("Admin menugaskan Reviewer");
  });

  // Negative: without a known source it does not guess who picked the reviewer.
  it("reads an assignment without a known source as automatic", () => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ action: "review.reviewer_assigned", after: null }));

    // Assert
    expect(sentence).toBe("Reviewer ditugaskan otomatis");
  });

  // Corner: an event without an actor.
  it("names the system when there is no actor", () => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ actor_user_id: null, actor_role: null }));

    // Assert
    expect(sentence).toBe("Sistem mengubah kasus");
  });

  // Negative: a role the client does not know yet (for example a new server role).
  it("uses a neutral subject for an unknown role", () => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ actor_role: "developer_ai" }));

    // Assert
    expect(sentence).toBe("Pengguna mengubah kasus");
  });

  // Negative: an actor with no role recorded is still a person, not the system.
  it("uses a neutral subject when a person has no role recorded", () => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ actor_role: null }));

    // Assert
    expect(sentence).toBe("Pengguna mengubah kasus");
  });

  // Negative: an action from a newer server shows its raw code instead of an empty cell.
  it("shows the raw code for an action it does not know", () => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ action: "measurement.started" }));

    // Assert
    expect(sentence).toBe("measurement.started");
  });

  // Negative: names of Object.prototype are not actions.
  it.each(["constructor", "toString", "__proto__"])("does not read %s as an action", (code) => {
    // Arrange / Act
    const sentence = auditActionSentence(entry({ action: code }));

    // Assert
    expect(sentence).toBe(code);
  });

  // Guard (moved from the removed actionLabels test): no sentence for a code the server never writes.
  it("knows exactly the actions the server writes", () => {
    // Arrange / Act / Assert
    expect([...KNOWN_AUDIT_ACTIONS].sort()).toEqual([...SERVER_ACTIONS].sort());
  });

  // Corner: an empty action stays empty.
  it("keeps an empty action empty", () => {
    // Arrange / Act / Assert
    expect(auditActionSentence(entry({ action: "" }))).toBe("");
  });

  // Corner: codes are matched exactly.
  it("does not match a code with different case or spaces", () => {
    // Arrange / Act / Assert
    expect(auditActionSentence(entry({ action: "Case.Submitted" }))).toBe("Case.Submitted");
    expect(auditActionSentence(entry({ action: " case.submitted " }))).toBe(" case.submitted ");
  });
});

describe("auditObjectLabel", () => {
  // K-07: a review record is about a case, so it reads as that case, not as "Review".
  it.each(["case", "case_version", "review"] as const)("reads a %s record as the case code", (type) => {
    // Arrange / Act
    const label = auditObjectLabel(entry({ entity_type: type, entity_label: "ILB-PT-0142" }));

    // Assert
    expect(label).toBe("Kasus ILB-PT-0142");
  });

  // Positive: other objects keep their own noun.
  it.each([
    ["suite", "Ketenagakerjaan 2026", "Suite Ketenagakerjaan 2026"],
    ["ai_product", "AiYU", "Produk AI AiYU"],
    ["user", "Contoh", "Pengguna Contoh"],
  ] as const)("reads a %s record with its own noun", (type, name, expected) => {
    // Arrange / Act
    const label = auditObjectLabel(entry({ entity_type: type, entity_label: name }));

    // Assert
    expect(label).toBe(expected);
  });

  // Negative: the object is gone, so only the id is left.
  it("falls back to the id when there is no name", () => {
    // Arrange / Act
    const label = auditObjectLabel(entry({ entity_type: "review", entity_id: "a1", entity_label: null }));

    // Assert
    expect(label).toBe("Kasus a1");
  });

  // Corner: a server without the field yet.
  it("falls back to the id when the server does not send a name", () => {
    // Arrange
    const old = entry({ entity_id: "c9" });
    delete old.entity_label;

    // Act
    const label = auditObjectLabel(old);

    // Assert
    expect(label).toBe("Kasus c9");
  });

  // Corner: a type from a newer server shows its raw name.
  it("shows the raw type for an object type it does not know", () => {
    // Arrange / Act
    const label = auditObjectLabel(
      entry({ entity_type: "measurement_session" as AuditEntry["entity_type"], entity_label: "Sesi 1" }),
    );

    // Assert
    expect(label).toBe("measurement_session Sesi 1");
  });
});
