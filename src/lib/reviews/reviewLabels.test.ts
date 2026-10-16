import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_STATUS_LABEL,
  ROUND_STATUS_LABEL,
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

  // Sudut
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

  // Sudut
  it("leaves no assignment status without a label", () => {
    for (const status of ASSIGNMENT_STATUSES) {
      expect(ASSIGNMENT_STATUS_LABEL[status]).not.toBe("");
    }
  });
});