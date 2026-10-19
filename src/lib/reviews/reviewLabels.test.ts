import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_STATUS_LABEL,
  ROUND_DECISION_LABEL,
  ROUND_STATUS_LABEL,
  VERDICT_DECISION_LABEL,
  newVersionLabel,
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
