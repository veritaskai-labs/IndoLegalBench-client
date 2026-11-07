import { describe, expect, it } from "vitest";

import { gradedAttempt, gradedCase } from "@/test/gradingFixtures";
import {
  ATTEMPT_SOURCE_LABEL,
  MASKED_CASE_LABEL,
  reasonLabel,
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

// AC9: an attempt keeps showing whether it came from the automatic runner or manual entry.
describe("ATTEMPT_SOURCE_LABEL (AC9)", () => {
  it("names both attempt sources", () => {
    expect(ATTEMPT_SOURCE_LABEL).toEqual({ automatic: "Otomatis", manual: "Manual" });
  });
});

// AC5: standard reasons arrive as stable codes; the client maps them to text (server migration
// 8ead8669ff79 seeds these four codes and leaves the list to the client).
describe("reasonLabel (AC5)", () => {
  it.each([
    ["regulation_not_cited", "Peraturan tidak disebut"],
    ["article_not_cited", "Pasal tidak disebut"],
    ["chained_refs_incomplete", "Rujukan berangkai kurang"],
    ["criterion_unmet", "Kriteria tidak terpenuhi"],
  ])("names %s as %s", (code, label) => {
    expect(reasonLabel(code)).toBe(label);
  });

  // Corner: a code from a newer server still shows, as it is, rather than disappearing.
  it("shows a code it does not know as it is", () => {
    expect(reasonLabel("unmet")).toBe("unmet");
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
      sourceLabel: "Otomatis",
      explanation: null,
      reasons: [],
    });
  });

  // AC5: the judge's explanation and the standard reasons, with the reasons named.
  it("carries the judge's explanation and the named reasons", () => {
    const row = toAttemptRow(
      gradedAttempt({ explanation: "Pasal 5 tidak disebut.", reasons: ["criterion_unmet", "article_not_cited"] }),
    );

    expect(row.explanation).toBe("Pasal 5 tidak disebut.");
    expect(row.reasons).toEqual(["Kriteria tidak terpenuhi", "Pasal tidak disebut"]);
  });

  it("names an attempt entered by hand as Manual", () => {
    expect(toAttemptRow(gradedAttempt({ source: "manual" })).sourceLabel).toBe("Manual");
  });

  // Edge: an explanation of only spaces says nothing, so it is not shown.
  it("treats a blank explanation as none", () => {
    expect(toAttemptRow(gradedAttempt({ explanation: "   " })).explanation).toBeNull();
  });

  // Edge: both fields are optional in the contract (default None, default_factory=list).
  it("treats a missing explanation or reason list as none", () => {
    const row = toAttemptRow(gradedAttempt({ explanation: undefined, reasons: undefined }));

    expect(row.explanation).toBeNull();
    expect(row.reasons).toEqual([]);
  });

  // AC4: an empty answer, a refusal or a judge error is a technical disruption, not a wrong answer.
  it("marks a technical disruption as not graded", () => {
    const row = toAttemptRow(gradedAttempt({ is_technical_disruption: true, score: null }));

    expect(row.scored).toBe(false);
    expect(row.scores).toEqual({ deterministic: "–", quality: "–", format: "–" });
    expect(row.note).toBe("Tidak dinilai: gangguan teknis");
  });

  // AC4: a disrupted attempt was not graded, so a reason or explanation it carries would mislead.
  it("drops the explanation and reasons of a disrupted attempt", () => {
    const row = toAttemptRow(
      gradedAttempt({ is_technical_disruption: true, explanation: "Penjelasan lama", reasons: ["criterion_unmet"] }),
    );

    expect(row.explanation).toBeNull();
    expect(row.reasons).toEqual([]);
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
