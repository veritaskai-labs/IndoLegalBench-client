import { describe, expect, it } from "vitest";

import type { AttemptResult, AttemptStatus, CaseFilter, MeasurementPurpose } from "@/types/measurement";
import {
  answerPlaceholder,
  ATTEMPT_STATUS_LABEL,
  attemptSummary,
  CASE_FILTER_LABEL,
  MEASUREMENT_PURPOSE_LABEL,
  sortedAttempts,
} from "./sessionDetail";

function attempt(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    id: "attempt-1",
    repetition_no: 1,
    status: "succeeded",
    answer_text: "Jawaban mentah",
    model_version: "gemini-qa212",
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
  const open = { masked: false, sessionEnded: true, viewerRole: "admin" as const };

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
        answerPlaceholder(attempt({ status, answer_text: null }), { ...open, masked: true, viewerRole: "developer_ai" }),
      ).toBe("Isi kasus test disembunyikan untuk Developer AI.");
    },
  );

  it.each<AttemptStatus>(["pending", "running"])("says a %s attempt has no answer yet", (status) => {
    expect(answerPlaceholder(attempt({ status, answer_text: null }), { ...open, sessionEnded: false })).toBe("Belum ada jawaban.");
  });

  it("says a technical failure left no answer", () => {
    expect(answerPlaceholder(attempt({ status: "technical_failure", answer_text: null }), open)).toBe(
      "Gagal teknis, tidak ada jawaban.",
    );
  });

  // server#91 093db8f: Developer AI sees progress but no answers until the session ends.
  it("tells Developer AI that answers appear once the session has ended", () => {
    expect(
      answerPlaceholder(attempt({ answer_text: null }), { masked: false, sessionEnded: false, viewerRole: "developer_ai" }),
    ).toBe("Jawaban tampil setelah sesi selesai.");
  });

  // Once the session has ended, Developer AI gets the answers, so a null one is not "wait for the end".
  it("does not tell Developer AI to wait once the session has ended", () => {
    expect(
      answerPlaceholder(attempt({ answer_text: null }), { masked: false, sessionEnded: true, viewerRole: "developer_ai" }),
    ).toBe("Tidak ada jawaban tersimpan.");
  });

  // Negative: a succeeded attempt without text for Admin should not happen; say so instead of a blank.
  it("falls back to a neutral message for a succeeded attempt without stored text", () => {
    expect(answerPlaceholder(attempt({ answer_text: null }), open)).toBe("Tidak ada jawaban tersimpan.");
  });
});
