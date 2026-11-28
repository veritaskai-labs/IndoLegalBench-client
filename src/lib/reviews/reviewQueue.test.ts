import { describe, expect, it } from "vitest";

import {
  activeAssignments,
  reassignmentReason,
  reviewerName,
} from "./reviewQueue";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";

function assignment(
  overrides: Partial<ReassignmentAssignment> = {},
): ReassignmentAssignment {
  return {
    id: "a1",
    reviewer_id: "u1",
    reviewer_name: "Aileen",
    status: "active",
    source: "system",
    assigned_at: "2026-10-16T03:00:00Z",
    ended_at: null,
    end_reason: null,
    ...overrides,
  };
}

function row(overrides: Partial<ReassignmentRow> = {}): ReassignmentRow {
  return {
    case_id: "c1",
    case_code: "ILB-PT-0142",
    case_title: "Sengketa tanah warisan",
    round_id: "r1",
    round_no: 1,
    round_status: "open",
    active_reviewers_count: 0,
    void_assignments: [],
    assignments: [],
    ...overrides,
  };
}

describe("reassignmentReason", () => {
  // Positif
  it("says the reviewer was deactivated when an assignment is void", () => {
    const voided = assignment({
      id: "a9",
      status: "void",
      void_reason: "deactivated",
    });

    expect(
      reassignmentReason(row({ void_assignments: [voided] })),
    ).toBe("Reviewer dinonaktifkan");
  });

  // Positif
  it("says nobody was assigned yet when the round is still waiting", () => {
    expect(reassignmentReason(row({ round_status: "awaiting_assignment" }))).toBe(
      "Belum ada reviewer",
    );
  });

  // corner
  it("prefers the deactivated reason over the waiting round", () => {
    const voided = assignment({ status: "void", void_reason: "deactivated" });

    expect(
      reassignmentReason(
        row({ round_status: "awaiting_assignment", void_assignments: [voided] }),
      ),
    ).toBe("Reviewer dinonaktifkan");
  });

  // Positif (AC8: role change is not a deactivation)
  it("names a role change as a role change, not a deactivation", () => {
    const voided = assignment({
      id: "a9",
      status: "void",
      void_reason: "role_changed",
    });

    expect(reassignmentReason(row({ void_assignments: [voided] }))).toBe(
      "Peran reviewer diubah",
    );
  });

  // Negatif (server sends null for a reason it does not know)
  it("uses a neutral reason when the void reason is null", () => {
    const voided = assignment({ status: "void", void_reason: null });

    expect(reassignmentReason(row({ void_assignments: [voided] }))).toBe(
      "Reviewer tidak lagi bertugas",
    );
  });

  // corner
  it("uses a neutral reason when the void reason is missing", () => {
    const voided = assignment({ status: "void" });

    expect(reassignmentReason(row({ void_assignments: [voided] }))).toBe(
      "Reviewer tidak lagi bertugas",
    );
  });

  // corner: one round can hold a deactivated and a role-changed reviewer
  it("takes the reason of the first void assignment when they differ", () => {
    const first = assignment({
      id: "a8",
      status: "void",
      void_reason: "role_changed",
    });
    const second = assignment({
      id: "a9",
      status: "void",
      void_reason: "deactivated",
    });

    expect(
      reassignmentReason(row({ void_assignments: [first, second] })),
    ).toBe("Peran reviewer diubah");
  });

  // corner
  it("falls back to a plain reason for an open round without an active reviewer", () => {
    expect(reassignmentReason(row())).toBe("Tidak ada reviewer aktif");
  });
  
  // Positif
  it("counts how many of the two reviewers are in place", () => {
    expect(
      reassignmentReason(row({ round_status: "open", active_reviewers_count: 1 })),
    ).toBe("Baru 1 dari 2 reviewer");
  });

  // corner
  it("falls back to a plain reason when the round already has both reviewers", () => {
    expect(
      reassignmentReason(row({ round_status: "open", active_reviewers_count: 2 })),
    ).toBe("Perlu penugasan ulang");
  });
});

describe("activeAssignments", () => {
  // Positif
  it("keeps only the assignments still in force", () => {
    const active = assignment({ id: "a1" });
    const replaced = assignment({ id: "a2", status: "replaced" });
    const voided = assignment({ id: "a3", status: "void" });

    expect(
      activeAssignments(row({ assignments: [active, replaced, voided] })),
    ).toEqual([active]);
  });

  // corner
  it("gives an empty list when nothing is active", () => {
    expect(activeAssignments(row())).toEqual([]);
  });
});

describe("reviewerName", () => {
  // Positif
  it("uses the name the server sent", () => {
    expect(reviewerName(assignment())).toBe("Aileen");
  });

  // Negatif
  it("stays readable when the server has no name", () => {
    expect(reviewerName(assignment({ reviewer_name: null }))).toBe(
      "Reviewer tidak diketahui",
    );
  });
});

describe("reassignment reasons in English", () => {
  it("names void reasons, gaps, and an unknown reviewer", () => {
    const deactivated = assignment({ status: "void", void_reason: "deactivated" });
    const roleChanged = assignment({ status: "void", void_reason: "role_changed" });

    expect(reassignmentReason(row({ void_assignments: [deactivated] }), "en")).toBe("Reviewer deactivated");
    expect(reassignmentReason(row({ void_assignments: [roleChanged] }), "en")).toBe("Reviewer role changed");
    expect(reassignmentReason(row({ void_assignments: [assignment({ status: "void", void_reason: null })] }), "en")).toBe(
      "Reviewer is no longer assigned",
    );
    expect(reassignmentReason(row({ round_status: "awaiting_assignment" }), "en")).toBe("No reviewer yet");
    expect(reassignmentReason(row(), "en")).toBe("No active reviewer");
    expect(reassignmentReason(row({ round_status: "open", active_reviewers_count: 1 }), "en")).toBe(
      "Only 1 of 2 reviewers",
    );
    expect(reassignmentReason(row({ round_status: "open", active_reviewers_count: 2 }), "en")).toBe(
      "Needs reassignment",
    );
    expect(reviewerName(assignment(), "en")).toBe("Aileen");
    expect(reviewerName(assignment({ reviewer_name: null }), "en")).toBe("Unknown reviewer");
  });
});
