import { describe, expect, it } from "vitest";

import { errorSummaryText, failedAttempts, modelVersionText } from "@/lib/runs/sessionErrors";
import type { AttemptResult, SessionCaseResult } from "@/types/measurement";

function attempt(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    repetition_no: 1,
    status: "succeeded",
    answer_text: "jawaban",
    model_version: "gemini-2.0-flash",
    ...overrides,
  };
}

function kasus(overrides: Partial<SessionCaseResult> = {}): SessionCaseResult {
  return {
    snapshot_item_id: "11111111-1111-1111-1111-111111111111",
    case_id: "22222222-2222-2222-2222-222222222222",
    case_code: "PJK-001",
    title: "Pajak penghasilan karyawan",
    question: "Berapa tarif PPh 21?",
    split_tag: "dev",
    masked: false,
    version_no: 3,
    sections: null,
    attempts: [],
    ...overrides,
  };
}

const gagal = { status: "technical_failure", answer_text: null } as const;

describe("failedAttempts (PBI-12 AC4)", () => {
  it("finds nothing when every call succeeded", () => {
    expect(failedAttempts([kasus({ attempts: [attempt(), attempt({ repetition_no: 2 })] })])).toEqual([]);
  });

  it("keeps only the technical failures, with the case they came from", () => {
    const hasil = failedAttempts([
      kasus({ attempts: [attempt({ repetition_no: 1 }), attempt({ repetition_no: 2, ...gagal })] }),
    ]);

    expect(hasil).toEqual([
      {
        key: "11111111-1111-1111-1111-111111111111-2",
        caseCode: "PJK-001",
        title: "Pajak penghasilan karyawan",
        repetitionNo: 2,
        modelVersion: "gemini-2.0-flash",
      },
    ]);
  });

  it("does not count a call that is still waiting or running as a failure", () => {
    const hasil = failedAttempts([
      kasus({
        attempts: [
          attempt({ repetition_no: 1, status: "pending", answer_text: null }),
          attempt({ repetition_no: 2, status: "running", answer_text: null }),
        ],
      }),
    ]);

    expect(hasil).toEqual([]);
  });

  it("sorts the repetitions inside a case without touching the array it was given", () => {
    const attempts = [attempt({ repetition_no: 3, ...gagal }), attempt({ repetition_no: 1, ...gagal })];

    const hasil = failedAttempts([kasus({ attempts })]);

    expect(hasil.map((f) => f.repetitionNo)).toEqual([1, 3]);
    expect(attempts.map((a) => a.repetition_no)).toEqual([3, 1]);
  });

  it("keeps the cases in the order the server sent them", () => {
    const hasil = failedAttempts([
      kasus({ case_code: "PJK-009", attempts: [attempt(gagal)] }),
      kasus({
        snapshot_item_id: "33333333-3333-3333-3333-333333333333",
        case_code: "PJK-002",
        attempts: [attempt(gagal)],
      }),
    ]);

    expect(hasil.map((f) => f.caseCode)).toEqual(["PJK-009", "PJK-002"]);
  });
});

describe("errorSummaryText (PBI-12 AC4)", () => {
  it("says so plainly when nothing failed", () => {
    expect(errorSummaryText(0)).toBe("Tidak ada panggilan yang gagal");
  });

  it("counts one failure", () => {
    expect(errorSummaryText(1)).toBe("1 panggilan gagal karena masalah teknis");
  });

  it("groups the thousands the Indonesian way", () => {
    expect(errorSummaryText(1500)).toBe("1.500 panggilan gagal karena masalah teknis");
  });
});

describe("modelVersionText", () => {
  it("shows the model version the call used", () => {
    expect(modelVersionText("gemini-2.0-flash")).toBe("gemini-2.0-flash");
  });

  it("says the version was not recorded when the server sends null", () => {
    expect(modelVersionText(null)).toBe("Tidak tercatat");
  });
});