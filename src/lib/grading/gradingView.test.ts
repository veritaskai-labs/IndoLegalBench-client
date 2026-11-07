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

  it("names the two grading paths", () => {
    expect(SCORE_PATH_LABEL).toEqual({ deterministic: "Deterministik", judge: "Penilai LLM" });
  });
});

describe("scoreCells (AC1, AC3)", () => {
  // AC1: the two paths are shown side by side and never merged into one number.
  it("formats each path on its own and adds no combined value", () => {
    expect(scoreCells({ deterministic: "1", judge: "3.5" })).toEqual({ deterministic: "1,00", judge: "3,50" });
  });

  it.each([null, undefined])("shows dashes when there is no score pair (%s)", (pair) => {
    expect(scoreCells(pair)).toEqual({ deterministic: "–", judge: "–" });
  });

  // Edge: one path may have no score yet while the other has one.
  it("shows a dash only for the path without a score", () => {
    expect(scoreCells({ deterministic: "0.50", judge: null })).toEqual({ deterministic: "0,50", judge: "–" });
  });
});

describe("toAttemptRow (AC4, AC9)", () => {
  it("shows a scored attempt with its repetition, status and both scores", () => {
    expect(toAttemptRow(gradedAttempt({ attempt_id: "a-2", repetition_no: 2 }))).toEqual({
      id: "a-2",
      label: "Percobaan 2",
      statusLabel: "Berhasil",
      scored: true,
      scores: { deterministic: "1,00", judge: "4,00" },
      note: null,
    });
  });

  // AC4: an empty answer, a refusal or a judge error is a technical disruption, not a wrong answer.
  it("marks a technical disruption as not graded", () => {
    const row = toAttemptRow(gradedAttempt({ is_technical_disruption: true, score: null }));

    expect(row.scored).toBe(false);
    expect(row.scores).toEqual({ deterministic: "–", judge: "–" });
    expect(row.note).toBe("Tidak dinilai: gangguan teknis");
  });

  // Defensive: if a disrupted attempt still carried a score, it must not look graded.
  it("hides a score that arrives on a disrupted attempt", () => {
    const row = toAttemptRow(gradedAttempt({ is_technical_disruption: true }));

    expect(row.scores).toEqual({ deterministic: "–", judge: "–" });
  });

  it("names a failed provider call with the attempt status the session page already uses", () => {
    expect(toAttemptRow(gradedAttempt({ status: "technical_failure", is_technical_disruption: true })).statusLabel).toBe(
      "Gagal teknis",
    );
  });
});

describe("toCaseRow (AC3, AC8)", () => {
  it("shows a case with its code, title, split and both average scores", () => {
    const row = toCaseRow(gradedCase({ scores: { deterministic: "0.67", judge: "3.75" } }));

    expect(row).toMatchObject({
      id: "item-1",
      code: "KC-001",
      title: "Kasus contoh A",
      splitTag: "dev",
      masked: false,
      scores: { deterministic: "0,67", judge: "3,75" },
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
    expect(toCaseRow(gradedCase({ scores: null })).scores).toEqual({ deterministic: "–", judge: "–" });
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
      scores: { deterministic: "–", judge: "–" },
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
      scores: { deterministic: "0.90", judge: "4.80" },
      attempts: [gradedAttempt({ answer_text: "Jawaban asli kasus test", score: { deterministic: "0.90", judge: "4.80" } })],
    });

    const shown = JSON.stringify(toCaseRow(leaked));

    for (const secret of ["KC-777", "Judul asli", "Pertanyaan asli", "Jawaban asli", "0,90", "4,80"]) {
      expect(shown).not.toContain(secret);
    }
  });
});
