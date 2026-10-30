import { describe, expect, it } from "vitest";

import { reviewerCandidates, candidatesExcept } from "./reviewerCandidates";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";
import type { User } from "@/types/user-management";

function user(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    name: "Roben",
    email: "roben@example.com",
    role: "contributor",
    is_active: true,
    ...overrides,
  };
}

function assignment(
  overrides: Partial<ReassignmentAssignment> = {},
): ReassignmentAssignment {
  return {
    id: "a1",
    reviewer_id: "u1",
    reviewer_name: "Roben",
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

describe("reviewerCandidates", () => {
  // Positif
  it("keeps the active contributors", () => {
    const pool = [
      user({ id: "u9", name: "Aileen" }),
      user({ id: "u5", name: "Esi", role: "viewer" }),
      user({ id: "u7", name: "Rafa", is_active: false }),
    ];

    expect(reviewerCandidates(pool, row(), null)).toEqual([
      { id: "u9", name: "Aileen" },
    ]);
  });

  // Negatif: D10, only the contributor reviews. Admin monitors and never reviews.
  it("drops the admin and the other roles that do not review", () => {
    const pool = [
      user({ id: "u1", name: "Roben", role: "admin" }),
      user({ id: "u2", name: "Esi", role: "viewer" }),
      user({ id: "u3", name: "Rafa", role: "developer_ai" }),
      user({ id: "u9", name: "Aileen" }),
    ];

    expect(reviewerCandidates(pool, row(), null)).toEqual([
      { id: "u9", name: "Aileen" },
    ]);
  });

  // Negatif
  it("drops a reviewer already assigned to this round", () => {
    const pool = [
      user({ id: "u1", name: "Roben" }),
      user({ id: "u9", name: "Aileen" }),
    ];
    const queued = row({ assignments: [assignment({ reviewer_id: "u1" })] });

    expect(reviewerCandidates(pool, queued, null)).toEqual([
      { id: "u9", name: "Aileen" },
    ]);
  });

  // Positif
  it("keeps a reviewer whose earlier assignment is no longer active", () => {
    const pool = [user({ id: "u1", name: "Roben" })];
    const queued = row({
      assignments: [assignment({ reviewer_id: "u1", status: "replaced" })],
    });

    expect(reviewerCandidates(pool, queued, null)).toEqual([
      { id: "u1", name: "Roben" },
    ]);
  });

  // corner
  it("sorts the candidates by name", () => {
    const pool = [
      user({ id: "u3", name: "Zahra" }),
      user({ id: "u2", name: "Aileen" }),
      user({ id: "u4", name: "Rafa" }),
    ];

    expect(reviewerCandidates(pool, row(), null).map((item) => item.name)).toEqual([
      "Aileen",
      "Rafa",
      "Zahra",
    ]);
  });

  // corner
  it("gives an empty list when nobody is eligible", () => {
    expect(reviewerCandidates([], row(), null)).toEqual([]);
  });
    // Negatif
  it("drops the case author even when they are an active contributor", () => {
    const pool = [
      user({ id: "u5", name: "Esi" }),
      user({ id: "u9", name: "Aileen" }),
    ];

    expect(reviewerCandidates(pool, row(), "u5")).toEqual([
      { id: "u9", name: "Aileen" },
    ]);
  });

  // corner
  it("keeps everyone when the author is not known yet", () => {
    const pool = [user({ id: "u9", name: "Aileen" })];

    expect(reviewerCandidates(pool, row(), null)).toEqual([
      { id: "u9", name: "Aileen" },
    ]);
  });
});

describe("candidatesExcept", () => {
  // AC7 dari tab "Dalam review": yang terpakai datang sebagai daftar id, bukan baris antrean.
  it("drops the taken reviewers and the author", () => {
    const users = [
      { id: "u1", name: "Roben", email: "r@x.test", role: "contributor", is_active: true },
      { id: "u5", name: "Esi", email: "e@x.test", role: "contributor", is_active: true },
      { id: "u9", name: "Aileen", email: "a@x.test", role: "contributor", is_active: true },
    ] as User[];

    const options = candidatesExcept(users, ["u1"], "u5");

    expect(options.map((item) => item.id)).toEqual(["u9"]);
  });
});