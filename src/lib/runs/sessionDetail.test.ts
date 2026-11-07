import { describe, expect, it } from "vitest";

import type { AttemptResult, AttemptStatus, CaseFilter, MeasurementPurpose, SessionCaseResult } from "@/types/measurement";
import {
  answerPlaceholder,
  ATTEMPT_STATUS_LABEL,
  attemptSummary,
  awaitingFirstAnswer,
  CASE_FILTER_LABEL,
  MEASUREMENT_PURPOSE_LABEL,
  sortedAttempts,
} from "./sessionDetail";

function attempt(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    repetition_no: 1,
    status: "succeeded",
    answer_text: "Jawaban mentah",
    model_version: "gemini-qa212",
    started_at: null,
    finished_at: null,
    ...overrides,
  };
}

describe("labels (PBI-11 AC1, AC2, AC8)", () => {
  it.each<[AttemptStatus, string]>([
    ["pending", "Menunggu"],
    ["running", "Berjalan"],
    ["succeeded", "Berhasil"],
    ["technical_failure", "Gagal teknis"],
  ])("names attempt status %s as %s", (status, label) => {
    expect(ATTEMPT_STATUS_LABEL[status]).toBe(label);
  });

  // Same wording as the create page (SCRUM-211), so a session reads the same on both pages.
  it.each<[MeasurementPurpose, string]>([
    ["official", "Pengukuran Resmi"],
    ["trial", "Uji Coba"],
  ])("names purpose %s as %s", (purpose, label) => {
    expect(MEASUREMENT_PURPOSE_LABEL[purpose]).toBe(label);
  });

  it.each<[CaseFilter, string]>([
    ["both", "Semua (Dev & Test)"],
    ["dev", "Hanya Dev"],
    ["test", "Hanya Test"],
  ])("names case filter %s as %s", (filter, label) => {
    expect(CASE_FILTER_LABEL[filter]).toBe(label);
  });
});

describe("sortedAttempts", () => {
  it("orders attempts by repetition number without changing the input", () => {
    const input = [attempt({ repetition_no: 3 }), attempt({ repetition_no: 1 }), attempt({ repetition_no: 2 })];

    expect(sortedAttempts(input).map((a) => a.repetition_no)).toEqual([1, 2, 3]);
    expect(input.map((a) => a.repetition_no)).toEqual([3, 1, 2]);
  });

  // Corner: a missing repetition (e.g. 1 and 3) stays a gap, nothing is invented.
  it("keeps a gap in the repetition numbers", () => {
    expect(sortedAttempts([attempt({ repetition_no: 3 }), attempt({ repetition_no: 1 })]).map((a) => a.repetition_no)).toEqual([1, 3]);
  });
});

describe("attemptSummary", () => {
  it("counts successful attempts out of all attempts", () => {
    expect(attemptSummary([attempt(), attempt({ repetition_no: 2 }), attempt({ repetition_no: 3 })])).toBe("3 dari 3 berhasil");
  });

  it("adds the technical failures when there are any", () => {
    const attempts = [
      attempt(),
      attempt({ repetition_no: 2, status: "technical_failure", answer_text: null }),
      attempt({ repetition_no: 3, status: "pending", answer_text: null }),
    ];

    expect(attemptSummary(attempts)).toBe("1 dari 3 berhasil · 1 gagal teknis");
  });

  it("says there is no attempt yet for an empty list", () => {
    expect(attemptSummary([])).toBe("Belum ada percobaan");
  });
});

describe("answerPlaceholder (why answer_text is null, server#91 session_detail)", () => {
  const open = { masked: false };

  it("returns null when there is an answer to show", () => {
    expect(answerPlaceholder(attempt(), open)).toBeNull();
  });

  // An empty string is a real (empty) answer from the provider, not a missing one.
  it("returns null for an empty answer, which the page shows as it is", () => {
    expect(answerPlaceholder(attempt({ answer_text: "" }), open)).toBeNull();
  });

  it.each<AttemptStatus>(["pending", "running", "succeeded", "technical_failure"])(
    "explains a masked test case first, even for a %s attempt",
    (status) => {
      expect(
        answerPlaceholder(attempt({ status, answer_text: null }), { masked: true }),
      ).toBe("Isi kasus test disembunyikan untuk Developer AI.");
    },
  );

  it.each<AttemptStatus>(["pending", "running"])("says a %s attempt has no answer yet", (status) => {
    expect(answerPlaceholder(attempt({ status, answer_text: null }), open)).toBe("Belum ada jawaban.");
  });

  it("says a technical failure left no answer", () => {
    expect(answerPlaceholder(attempt({ status: "technical_failure", answer_text: null }), open)).toBe(
      "Gagal teknis, tidak ada jawaban.",
    );
  });

  // SCRUM-261: Developer AI gets dev answers while the session runs, so no role is told to wait for the end.
  it("gives the neutral message when a succeeded attempt has no text, for any viewer", () => {
    expect(answerPlaceholder(attempt({ answer_text: null }), open)).toBe("Tidak ada jawaban tersimpan.");
  });

  // Negative: a succeeded attempt without text for Admin should not happen; say so instead of a blank.
  it("falls back to a neutral message for a succeeded attempt without stored text", () => {
    expect(answerPlaceholder(attempt({ answer_text: null }), open)).toBe("Tidak ada jawaban tersimpan.");
  });
});

function caseResult(overrides: Partial<SessionCaseResult> = {}): SessionCaseResult {
  return { snapshot_item_id: "item-1", masked: false, attempts: [attempt({ answer_text: null, status: "pending" })], ...overrides } as SessionCaseResult;
}

describe("awaitingFirstAnswer (PBI-11 AC9 empty state)", () => {
  it("is true when no readable case has an answer yet", () => {
    const cases = [caseResult(), caseResult({ snapshot_item_id: "item-2", attempts: [attempt({ status: "running", answer_text: null })] })];

    expect(awaitingFirstAnswer(cases)).toBe(true);
  });

  it("is false as soon as one attempt of a readable case has text", () => {
    const cases = [caseResult(), caseResult({ snapshot_item_id: "item-2", attempts: [attempt({ answer_text: "Jawaban pertama" })] })];

    expect(awaitingFirstAnswer(cases)).toBe(false);
  });

  // An empty string is a real answer from the provider.
  it("is false when an attempt answered with an empty string", () => {
    expect(awaitingFirstAnswer([caseResult({ attempts: [attempt({ answer_text: "" })] })])).toBe(false);
  });

  // Test cases are masked for Developer AI and will never show an answer, so waiting would be a lie.
  it("is false when every case is masked", () => {
    expect(awaitingFirstAnswer([caseResult({ masked: true }), caseResult({ snapshot_item_id: "item-2", masked: true })])).toBe(false);
  });

  it("ignores masked cases when a readable case is still waiting", () => {
    expect(awaitingFirstAnswer([caseResult({ masked: true }), caseResult({ snapshot_item_id: "item-2" })])).toBe(true);
  });

  it("is false when there are no cases", () => {
    expect(awaitingFirstAnswer([])).toBe(false);
  });

  it("is false for a readable case that has no attempts yet", () => {
    expect(awaitingFirstAnswer([caseResult({ attempts: [] })])).toBe(false);
  });

  // Every attempt already finished, only as a technical failure: nothing is coming, so do not say "wait".
  it("is false when every attempt finished as a technical failure", () => {
    const cases = [caseResult({ attempts: [attempt({ status: "technical_failure", answer_text: null })] })];

    expect(awaitingFirstAnswer(cases)).toBe(false);
  });

  it("is true when some attempts failed but another one is still pending", () => {
    const cases = [
      caseResult({
        attempts: [attempt({ status: "technical_failure", answer_text: null }), attempt({ id: "55555555-5555-5555-5555-555555555555", repetition_no: 2, status: "pending", answer_text: null })],
      }),
    ];

    expect(awaitingFirstAnswer(cases)).toBe(true);
  });

  it("is true when the only unanswered attempt is running", () => {
    const cases = [caseResult({ attempts: [attempt({ status: "running", answer_text: null })] })];

    expect(awaitingFirstAnswer(cases)).toBe(true);
  });
});
