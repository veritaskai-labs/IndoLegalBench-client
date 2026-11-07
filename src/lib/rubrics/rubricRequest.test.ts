import { describe, expect, it } from "vitest";

import { createRubricV1Draft, type RubricDraft } from "./rubricDraft";
import { toCreateRequest } from "./rubricRequest";

function draft(overrides: Partial<RubricDraft> = {}): RubricDraft {
  return {
    effectiveDate: "2026-10-27",
    approvedByName: "Steven & Deanne",
    approvedAt: "2026-10-27",
    judgePromptQuality: "Nilai kualitas.",
    judgePromptFormat: "Nilai format.",
    aspects: [
      { id: "a-1", name: "Kesimpulan", graderPath: "llm", weight: "60", definition: "Ketepatan hasil akhir", descriptors: { 5: "Benar", 4: "Cukup" } },
      { id: "a-2", name: "Dasar Hukum", graderPath: "deterministic", weight: "40", definition: "Ketepatan rujukan", descriptors: { 5: "Akurat" } },
    ],
    levels: [
      { score: 5, label: "Sempurna", isPassing: true },
      { score: 4, label: "Baik", isPassing: true },
    ],
    ...overrides,
  };
}

describe("toCreateRequest (POST /admin/rubrics, AC7)", () => {
  // Positive: the whole draft becomes the server's snake_case body.
  it("maps a complete draft to the request body", () => {
    // Arrange
    const source = draft();

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request).toEqual({
      effective_date: "2026-10-27",
      judge_prompt_quality: "Nilai kualitas.",
      judge_prompt_format: "Nilai format.",
      approved_by_name: "Steven & Deanne",
      approved_at: "2026-10-27",
      aspects: [
        { name: "Kesimpulan", grader_path: "llm", weight: 60, definition: "Ketepatan hasil akhir" },
        { name: "Dasar Hukum", grader_path: "deterministic", weight: 40, definition: "Ketepatan rujukan" },
      ],
      levels: [
        {
          score: 5,
          label: "Sempurna",
          is_passing: true,
          descriptors: [
            { aspect_name: "Kesimpulan", descriptor: "Benar" },
            { aspect_name: "Dasar Hukum", descriptor: "Akurat" },
          ],
        },
        { score: 4, label: "Baik", is_passing: true, descriptors: [{ aspect_name: "Kesimpulan", descriptor: "Cukup" }] },
      ],
    });
  });

  // The server numbers the aspects from the order of the array, so the client sends no sort_order.
  it("keeps aspects in the order they were written and sends no sort_order", () => {
    // Arrange
    const source = createRubricV1Draft();

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.aspects.map((a) => a.name)).toEqual(["Kesimpulan", "Dasar Hukum", "Argumentasi"]);
    expect(request.aspects[0]).not.toHaveProperty("sort_order");
  });

  // Edge: holistic rubric, the client gave no weights (all empty is valid on the server).
  it("sends a blank weight as null", () => {
    // Arrange
    const source = createRubricV1Draft();

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.aspects.map((a) => a.weight)).toEqual([null, null, null]);
  });

  it("reads a decimal weight as a number", () => {
    // Arrange
    const source = draft({ aspects: [{ id: "a-1", name: "A", graderPath: "llm", weight: "33.5", definition: "d", descriptors: {} }] });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.aspects[0].weight).toBe(33.5);
  });

  // Edge: the approver is optional, TBA from the client; the server rejects a blank name.
  it("sends a missing approver and approval date as null", () => {
    // Arrange
    const source = draft({ approvedByName: "", approvedAt: "" });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.approved_by_name).toBeNull();
    expect(request.approved_at).toBeNull();
  });

  it("sends a whitespace-only approver as null", () => {
    // Arrange
    const source = draft({ approvedByName: "   " });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.approved_by_name).toBeNull();
  });

  // Edge: a descriptor nobody wrote is left out, not sent as an empty string.
  it("leaves out blank descriptors", () => {
    // Arrange
    const source = draft({
      aspects: [{ id: "a-1", name: "A", graderPath: "llm", weight: "", definition: "d", descriptors: { 5: "Ada", 4: "", 3: "   " } }],
      levels: [
        { score: 5, label: "Lima", isPassing: true },
        { score: 4, label: "Empat", isPassing: true },
        { score: 3, label: "Tiga", isPassing: false },
      ],
    });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.levels.map((l) => l.descriptors)).toEqual([[{ aspect_name: "A", descriptor: "Ada" }], [], []]);
  });

  // Edge: a level nobody described still goes out, with an empty descriptor list.
  it("sends a level without any descriptor as an empty list", () => {
    // Arrange
    const source = draft({ levels: [{ score: 0, label: "Fatal", isPassing: false }] });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.levels).toEqual([{ score: 0, label: "Fatal", is_passing: false, descriptors: [] }]);
  });

  it("puts each descriptor on its own level and lists them in aspect order", () => {
    // Arrange
    const source = draft({
      aspects: [
        { id: "a-1", name: "A", graderPath: "llm", weight: "", definition: "d", descriptors: { 0: "A nol", 5: "A lima" } },
        { id: "a-2", name: "B", graderPath: "llm", weight: "", definition: "d", descriptors: { 5: "B lima" } },
      ],
      levels: [
        { score: 5, label: "Lima", isPassing: true },
        { score: 0, label: "Nol", isPassing: false },
      ],
    });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.levels[0].descriptors).toEqual([
      { aspect_name: "A", descriptor: "A lima" },
      { aspect_name: "B", descriptor: "B lima" },
    ]);
    expect(request.levels[1].descriptors).toEqual([{ aspect_name: "A", descriptor: "A nol" }]);
  });

  // Negative: the server judges the content (422), so blank required text is sent as typed.
  it("sends blank required text as typed for the server to refuse", () => {
    // Arrange
    const source = draft({ judgePromptQuality: "", aspects: [{ id: "a-1", name: "", graderPath: "llm", weight: "", definition: "", descriptors: {} }] });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.judge_prompt_quality).toBe("");
    expect(request.aspects[0]).toMatchObject({ name: "", definition: "" });
  });

  // Negative: text that is not a number must not turn into NaN, which JSON would send as null anyway.
  it("sends a weight that is not a number as null", () => {
    // Arrange
    const source = draft({ aspects: [{ id: "a-1", name: "A", graderPath: "llm", weight: "abc", definition: "d", descriptors: {} }] });

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.aspects[0].weight).toBeNull();
  });

  // Negative: the id is only for the form's keys, the server has no such field.
  it("does not send the editing id of an aspect to the server", () => {
    // Arrange
    const source = draft();

    // Act
    const request = toCreateRequest(source);

    // Assert
    expect(request.aspects[0]).not.toHaveProperty("id");
  });

  it("does not change the draft it was given", () => {
    // Arrange
    const source = draft();
    const snapshot = structuredClone(source);

    // Act
    toCreateRequest(source);

    // Assert
    expect(source).toEqual(snapshot);
  });
});
