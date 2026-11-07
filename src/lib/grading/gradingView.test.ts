import { describe, expect, it } from "vitest";

import { gradedAttempt, gradedCase } from "@/test/gradingFixtures";
import {
  MASKED_CASE_LABEL,
  SCORE_GROUP_LABEL,
  SCORE_PATH_LABEL,
  scoreCells,
  toAttemptRow,
  toCaseRow,
} from "./gradingView";

describe("labels (PBI-14 AC1, PBI-11 AC9)", () => {
  it("names the three separate scores", () => {
    expect(SCORE_GROUP_LABEL).toEqual({ dev: "Dev", test: "Test", combined: "Gabungan" });
  });

  // server#114 bff8755 (SCRUM-225): the judge path reports quality and format separately.
  it("names the deterministic path and both judge aspects", () => {
    expect(SCORE_PATH_LABEL).toEqual({ deterministic: "Deterministik", quality: "Kualitas LLM", format: "Format LLM" });
  });
});

describe("scoreCells (AC1, AC3)", () => {
  // AC1: the scores are shown side by side and never merged into one number.
  it("formats each score on its own and adds no combined value", () => {
    expect(scoreCells({ deterministic: "1", quality: "0.5", format: "0.25" })).toEqual({
      deterministic: "1,00",
      quality: "0,50",
      format: "0,25",
    });
  });

  it.each([null, undefined])("shows dashes when there is no score pair (%s)", (pair) => {
    expect(scoreCells(pair)).toEqual({ deterministic: "–", quality: "–", format: "–" });
  });

  // Edge: one score may be missing while the others are there.
  it("shows a dash only for the score that is null", () => {
    expect(scoreCells({ deterministic: "0.50", quality: null, format: "0.75" })).toEqual({
      deterministic: "0,50",
      quality: "–",
      format: "0,75",
    });
  });

  // Edge: every field of ScorePair is optional in the contract, so a key may be absent altogether.
  it("shows a dash for a score the server left out", () => {
    expect(scoreCells({ deterministic: "0.50" })).toEqual({ deterministic: "0,50", quality: "–", format: "–" });
  });
});

describe("toAttemptRow (AC4, AC9)", () => {
  it("shows a scored attempt with its repetition, status and every score", () => {
    expect(toAttemptRow(gradedAttempt({ attempt_id: "a-2", repetition_no: 2 }))).toEqual({
      id: "a-2",
      label: "Percobaan 2",
      statusLabel: "Berhasil",
      scored: true,
      scores: { deterministic: "1,00", quality: "0,80", format: "0,75" },
      note: null,
    });
  });

  // AC4: an empty answer, a refusal or a judge error is a technical disruption, not a wrong answer.
  it("marks a technical disruption as not graded", () => {
    const row = toAttemptRow(gradedAttempt({ is_technical_disruption: true, score: null }));

    expect(row.scored).toBe(false);
    expect(row.scores).toEqual({ deterministic: "–", quality: "–", format: "–" });
    expect(row.note).toBe("Tidak dinilai: gangguan teknis");
  });

  // Defensive: if a disrupted attempt still carried a score, it must not look graded.
  it("hides a score that arrives on a disrupted attempt", () => {
    const row = toAttemptRow(gradedAttempt({ is_technical_disruption: true }));

    expect(row.scores).toEqual({ deterministic: "–", quality: "–", format: "–" });
  });

  it("names a failed provider call with the attempt status the session page already uses", () => {
    expect(toAttemptRow(gradedAttempt({ status: "technical_failure", is_technical_disruption: true })).statusLabel).toBe(
      "Gagal teknis",
    );
  });
});

describe("toCaseRow (AC3, AC8)", () => {
  it("shows a case with its code, title, split and every average score", () => {
    const row = toCaseRow(gradedCase({ scores: { deterministic: "0.67", quality: "0.60", format: "0.50" } }));

    expect(row).toMatchObject({
      id: "item-1",
      code: "KC-001",
      title: "Kasus contoh A",
      splitTag: "dev",
      masked: false,
      scores: { deterministic: "0,67", quality: "0,60", format: "0,50" },
    });
  });

  it("lists the attempts by repetition number", () => {
    const row = toCaseRow(
      gradedCase({
        attempts: [gradedAttempt({ attempt_id: "a-3", repetition_no: 3 }), gradedAttempt({ attempt_id: "a-1", repetition_no: 1 })],
      }),
    );

    expect(row.attempts.map((attempt) => attempt.label)).toEqual(["Percobaan 1", "Percobaan 3"]);
  });

  // Edge: both fields are optional in the contract (default_factory=list, default None).
  it("treats a case without attempts or split tag as having none", () => {
    const row = toCaseRow(gradedCase({ attempts: undefined, split_tag: undefined }));

    expect(row.attempts).toEqual([]);
    expect(row.splitTag).toBeNull();
  });

  it("shows dashes for a case that has no score yet", () => {
    expect(toCaseRow(gradedCase({ scores: null })).scores).toEqual({ deterministic: "–", quality: "–", format: "–" });
  });

  // AC8, server#114: a test case seen by Developer AI shows only the aggregate, so the row names
  // nothing about the case and has no attempts to open.
  it("shows a masked test case without its code, title, scores or attempts", () => {
    const row = toCaseRow(gradedCase({ masked: true, split_tag: "test", case_code: "[TERSEMBUNYI]", title: "[TERSEMBUNYI]" }));

    expect(row).toMatchObject({
      code: null,
      title: MASKED_CASE_LABEL,
      splitTag: "test",
      masked: true,
      scores: { deterministic: "–", quality: "–", format: "–" },
      attempts: [],
    });
  });

  // Security, second layer: the server masks, but if a masked row ever carried the real content,
  // the client still must not pass it on to the table.
  it("drops content that a masked row should not carry", () => {
    const leaked = gradedCase({
      masked: true,
      case_code: "KC-777",
      title: "Judul asli kasus test",
      question: "Pertanyaan asli kasus test",
      scores: { deterministic: "0.91", quality: "0.92", format: "0.93" },
      attempts: [
        gradedAttempt({ answer_text: "Jawaban asli kasus test", score: { deterministic: "0.91", quality: "0.92", format: "0.93" } }),
      ],
    });

    const shown = JSON.stringify(toCaseRow(leaked));

    for (const secret of ["KC-777", "Judul asli", "Pertanyaan asli", "Jawaban asli", "0,91", "0,92", "0,93"]) {
      expect(shown).not.toContain(secret);
    }
  });
});
