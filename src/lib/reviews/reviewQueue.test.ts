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
    const voided = assignment({ id: "a9", status: "void" });

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
    const voided = assignment({ status: "void" });

    expect(
      reassignmentReason(
        row({ round_status: "awaiting_assignment", void_assignments: [voided] }),
      ),
    ).toBe("Reviewer dinonaktifkan");
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