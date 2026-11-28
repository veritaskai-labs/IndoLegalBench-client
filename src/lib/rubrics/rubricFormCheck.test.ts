import { describe, expect, it } from "vitest";

import { createEmptyDraft, createRubricV1Draft, type RubricDraft } from "./rubricDraft";
import {
  formSections,
  isDraftEmpty,
  passingSummary,
  problemSummary,
  requiredProblems,
  saveSummaryRows,
} from "./rubricFormCheck";

/** A draft that the server would accept: every required text filled in. */
function completeDraft(): RubricDraft {
  const draft = createRubricV1Draft();
  return {
    ...draft,
    effectiveDate: "2026-12-01",
    judgePromptQuality: "Nilai kualitas jawaban.",
    judgePromptFormat: "Nilai format jawaban.",
    aspects: draft.aspects.map((aspect) => ({ ...aspect, definition: `Definisi ${aspect.name}` })),
  };
}

describe("requiredProblems (B1, B5: isian wajib)", () => {
  // Positive: a complete draft has nothing missing.
  it("finds nothing in a complete draft", () => {
    // Act
    const problems = requiredProblems(completeDraft());

    // Assert
    expect(problems).toEqual([]);
  });

  // Negative: an empty form lists every required field once, top to bottom, with the server's field path.
  it("lists every required field of an empty form in form order", () => {
    // Act
    const problems = requiredProblems(createEmptyDraft());

    // Assert
    expect(problems.map((problem) => problem.path)).toEqual([
      "effective_date",
      "judge_prompt_quality",
      "judge_prompt_format",
      "levels[0].label",
      "levels[1].label",
      "levels[2].label",
      "levels[3].label",
      "levels[4].label",
      "levels[5].label",
      "aspects[0].name",
      "aspects[0].definition",
    ]);
  });

  // Positive: each message names the field, with the score or aspect number where there are several.
  it("names the missing field in its message", () => {
    // Act
    const messages = Object.fromEntries(requiredProblems(createEmptyDraft()).map((problem) => [problem.path, problem.message]));

    // Assert
    expect(messages).toMatchObject({
      effective_date: "Isi tanggal berlaku sejak.",
      judge_prompt_quality: "Isi prompt penilai kualitas.",
      judge_prompt_format: "Isi prompt penilai format.",
      "levels[0].label": "Isi label skor 5.",
      "levels[5].label": "Isi label skor 0.",
      "aspects[0].name": "Isi nama aspek 1.",
      "aspects[0].definition": "Isi definisi aspek 1.",
    });
  });

  // Edge: spaces only count as empty; edge because the server strips text (TeksWajib) and would refuse it with a 422.
  it("treats text with only spaces as missing", () => {
    // Arrange
    const draft = { ...completeDraft(), judgePromptFormat: "   " };

    // Act
    const problems = requiredProblems(draft);

    // Assert
    expect(problems.map((problem) => problem.path)).toEqual(["judge_prompt_format"]);
  });

  // Negative: optional fields (approver, approval date, weight, descriptors) are never asked for.
  it("does not ask for the optional fields", () => {
    // Arrange
    const draft = completeDraft();
    draft.approvedByName = "";
    draft.approvedAt = "";
    draft.aspects = draft.aspects.map((aspect) => ({ ...aspect, weight: "", descriptors: {} }));

    // Act
    const problems = requiredProblems(draft);

    // Assert
    expect(problems).toEqual([]);
  });

  // Edge: the second aspect gets its own number and index; edge because an off-by-one would point the message at aspect 1.
  it("numbers the fields of a later aspect", () => {
    // Arrange
    const draft = completeDraft();
    draft.aspects[1] = { ...draft.aspects[1], name: "" };

    // Act
    const [problem] = requiredProblems(draft);

    // Assert
    expect(problem).toEqual({ path: "aspects[1].name", sectionId: "aspek-2", message: "Isi nama aspek 2." });
  });
});

describe("formSections (B1: navigasi bagian dengan centang)", () => {
  // Positive: the four kinds of section, one per aspect, with the missing count.
  it("lists the sections with a missing count and a check for the complete ones", () => {
    // Arrange
    const draft = createEmptyDraft();
    draft.effectiveDate = "2026-12-01";
    draft.levels = draft.levels.map((level) => ({ ...level, label: `Label ${level.score}` }));

    // Act
    const sections = formSections(draft);

    // Assert
    expect(sections).toEqual([
      { id: "informasi", title: "Informasi versi", problems: 0, complete: true },
      { id: "prompt", title: "Prompt penilai", problems: 2, complete: false },
      { id: "skala", title: "Skala nilai", problems: 0, complete: true },
      { id: "aspek-1", title: "Aspek 1", problems: 2, complete: false },
    ]);
  });

  // Positive: the v1 template has three aspects, so three aspect sections.
  it("has one section per aspect", () => {
    // Act
    const titles = formSections(completeDraft()).map((section) => section.title);

    // Assert
    expect(titles).toEqual(["Informasi versi", "Prompt penilai", "Skala nilai", "Aspek 1", "Aspek 2", "Aspek 3"]);
  });
});

describe("problemSummary (B5: ringkasan galat)", () => {
  // Positive: count plus the sections to look at, as in the Figma state.
  it("counts the missing fields and names their sections", () => {
    // Arrange
    const draft = completeDraft();
    draft.judgePromptQuality = "";
    draft.judgePromptFormat = "";
    draft.aspects[0] = { ...draft.aspects[0], definition: "" };

    // Act
    const text = problemSummary(formSections(draft));

    // Assert
    expect(text).toBe("3 isian wajib belum diisi di Prompt penilai dan Aspek 1. Versi belum disimpan.");
  });

  // Edge: three sections need commas and one "dan"; edge because two sections only need "dan".
  it("joins three or more sections with commas and a final dan", () => {
    // Act
    const text = problemSummary(formSections(createEmptyDraft()));

    // Assert
    expect(text).toBe("11 isian wajib belum diisi di Informasi versi, Prompt penilai, Skala nilai dan Aspek 1. Versi belum disimpan.");
  });

  // Edge: one section alone has no joiner at all.
  it("names a single section alone", () => {
    // Arrange
    const draft = { ...completeDraft(), effectiveDate: "" };

    // Act
    const text = problemSummary(formSections(draft));

    // Assert
    expect(text).toBe("1 isian wajib belum diisi di Informasi versi. Versi belum disimpan.");
  });
});

describe("passingSummary (B2: ringkasan ambang lulus)", () => {
  // Positive: the default 5 and 4 pass.
  it("names the passing and failing scores of the default scale", () => {
    // Act
    const text = passingSummary(createEmptyDraft().levels);

    // Assert
    expect(text).toBe("Lulus: skor 5 dan 4. Tidak lulus: skor 3, 2, 1, 0.");
  });

  // Edge: nothing ticked; edge because the server refuses a rubric without a passing level, so the line must say so.
  it("says when no score passes", () => {
    // Arrange
    const levels = createEmptyDraft().levels.map((level) => ({ ...level, isPassing: false }));

    // Act
    const text = passingSummary(levels);

    // Assert
    expect(text).toBe("Lulus: belum ada skor. Tidak lulus: skor 5, 4, 3, 2, 1, 0.");
  });

  // Edge: everything ticked; edge because the server also needs at least one failing level.
  it("says when no score fails", () => {
    // Arrange
    const levels = createEmptyDraft().levels.map((level) => ({ ...level, isPassing: true }));

    // Act
    const text = passingSummary(levels);

    // Assert
    expect(text).toBe("Lulus: skor 5, 4, 3, 2, 1, 0. Tidak lulus: belum ada skor.");
  });
});

describe("isDraftEmpty (B6: konfirmasi hanya bila formulir berisi)", () => {
  // Positive: a fresh form is empty, so Batal and the template act right away.
  it("is true for a fresh form", () => {
    expect(isDraftEmpty(createEmptyDraft())).toBe(true);
  });

  // Negative: one typed character is enough to ask first.
  it("is false once any text is typed", () => {
    // Arrange
    const draft = createEmptyDraft();
    draft.aspects[0] = { ...draft.aspects[0], descriptors: { 3: "x" } };

    // Act + Assert
    expect(isDraftEmpty(draft)).toBe(false);
  });

  // Edge: a changed tick or path is a change too; edge because no text was typed, yet the template would undo it.
  it("is false when only a passing tick or a path changed", () => {
    // Arrange
    const ticked = createEmptyDraft();
    ticked.levels[2] = { ...ticked.levels[2], isPassing: true };
    const path = createEmptyDraft();
    path.aspects[0] = { ...path.aspects[0], graderPath: "deterministic" };

    // Act + Assert
    expect(isDraftEmpty(ticked)).toBe(false);
    expect(isDraftEmpty(path)).toBe(false);
  });

  // Edge: an extra empty aspect is still a change the Admin made.
  it("is false when an aspect was added", () => {
    // Arrange
    const draft = createEmptyDraft();
    draft.aspects = [...draft.aspects, { ...draft.aspects[0], id: "aspek-extra" }];

    // Act + Assert
    expect(isDraftEmpty(draft)).toBe(false);
  });

  // Negative: the template counts as filled in.
  it("is false for the template", () => {
    expect(isDraftEmpty(createRubricV1Draft())).toBe(false);
  });
});

describe("saveSummaryRows (B4: dialog ringkasan sebelum menyimpan)", () => {
  // Positive: the four facts that are hard to fix later, as in the Figma dialog.
  it("summarises date, approver, passing scores and aspects", () => {
    // Arrange
    const draft = completeDraft();
    draft.approvedByName = "Aileen Josephine Halim";
    draft.approvedAt = "2026-11-28";
    draft.aspects = [{ ...draft.aspects[0], weight: "25" }, { ...draft.aspects[1], graderPath: "deterministic" }];

    // Act
    const rows = saveSummaryRows(draft);

    // Assert
    expect(rows).toEqual([
      { label: "Berlaku sejak", values: ["01 Des 2026"] },
      { label: "Penyetuju", values: ["Aileen Josephine Halim · 28 Nov 2026"] },
      { label: "Skor lulus", values: ["5 dan 4"] },
      { label: "Aspek", values: ["1 · Kesimpulan · LLM judge · bobot 25", "2 · Dasar Hukum · Deterministik"] },
    ]);
  });

  // Edge: no approver yet; edge because the approver is optional (TBA from the client) and the row must not look broken.
  it("shows a dash for a missing approver and the name alone without a date", () => {
    // Arrange
    const none = { ...completeDraft(), approvedByName: " ", approvedAt: "2026-11-28" };
    const nameOnly = { ...completeDraft(), approvedByName: "Aileen", approvedAt: "" };

    // Act
    const [, noneRow] = saveSummaryRows(none);
    const [, nameRow] = saveSummaryRows(nameOnly);

    // Assert
    expect(noneRow.values).toEqual(["-"]);
    expect(nameRow.values).toEqual(["Aileen"]);
  });

  // Edge: no passing score is still summarised; edge because the server refuses it and the dialog should not hide that.
  it("shows a dash when no score passes", () => {
    // Arrange
    const draft = completeDraft();
    draft.levels = draft.levels.map((level) => ({ ...level, isPassing: false }));

    // Act
    const [, , passing] = saveSummaryRows(draft);

    // Assert
    expect(passing.values).toEqual(["-"]);
  });
});
