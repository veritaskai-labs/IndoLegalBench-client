import { describe, expect, it } from "vitest";

import { createEmptyDraft, createRubricV1Draft, type RubricDraft } from "./rubricDraft";
import { addAspect, removeAspect, setDescriptor, setField, updateAspect, updateLevel } from "./rubricDraftEdit";

function twoAspects(): RubricDraft {
  const draft = createEmptyDraft();
  draft.aspects = [
    { id: "a-1", name: "A", graderPath: "llm", weight: "", definition: "a", descriptors: { 5: "lima" } },
    { id: "a-2", name: "B", graderPath: "deterministic", weight: "", definition: "b", descriptors: {} },
  ];
  return draft;
}

describe("setField", () => {
  // Positive
  it("sets one text field and keeps the rest", () => {
    // Arrange
    const draft = createEmptyDraft();

    // Act
    const next = setField(draft, "judgePromptQuality", "Nilai kualitas.");

    // Assert
    expect(next.judgePromptQuality).toBe("Nilai kualitas.");
    expect(next.aspects).toEqual(draft.aspects);
    expect(next.levels).toEqual(draft.levels);
  });

  // Edge: the form edits state in React, so the old draft must stay as it was.
  it("returns a new draft and leaves the old one unchanged", () => {
    // Arrange
    const draft = createEmptyDraft();

    // Act
    const next = setField(draft, "effectiveDate", "2026-11-06");

    // Assert
    expect(next).not.toBe(draft);
    expect(draft.effectiveDate).toBe("");
  });
});

describe("updateAspect", () => {
  it("keeps the id of the aspect it changes", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = updateAspect(draft, 1, { name: "B baru" });

    // Assert
    expect(next.aspects.map((aspect) => aspect.id)).toEqual(["a-1", "a-2"]);
  });

  it("changes only the given aspect", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = updateAspect(draft, 1, { name: "B baru", graderPath: "llm", weight: "40" });

    // Assert
    expect(next.aspects[1]).toMatchObject({ name: "B baru", graderPath: "llm", weight: "40", definition: "b" });
    expect(next.aspects[0]).toEqual(draft.aspects[0]);
  });

  it("does not change the draft it was given", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    updateAspect(draft, 0, { name: "Diubah" });

    // Assert
    expect(draft.aspects[0].name).toBe("A");
  });

  // Negative: an index that does not exist changes nothing.
  it.each([-1, 2, 99])("ignores the index %i that is not an aspect", (index) => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = updateAspect(draft, index, { name: "X" });

    // Assert
    expect(next).toEqual(draft);
  });
});

describe("setDescriptor", () => {
  it("writes the descriptor of one aspect at one score", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = setDescriptor(draft, 1, 3, "tiga");

    // Assert
    expect(next.aspects[1].descriptors).toEqual({ 3: "tiga" });
    expect(next.aspects[0].descriptors).toEqual({ 5: "lima" });
  });

  it("replaces an existing descriptor", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = setDescriptor(draft, 0, 5, "baru");

    // Assert
    expect(next.aspects[0].descriptors).toEqual({ 5: "baru" });
  });

  // Edge: clearing the text keeps the key, and toCreateRequest leaves blank ones out.
  it("keeps an emptied descriptor as an empty string", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = setDescriptor(draft, 0, 5, "");

    // Assert
    expect(next.aspects[0].descriptors).toEqual({ 5: "" });
  });

  it("does not change the descriptors of the draft it was given", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    setDescriptor(draft, 0, 5, "baru");

    // Assert
    expect(draft.aspects[0].descriptors).toEqual({ 5: "lima" });
  });

  it("ignores an aspect index that does not exist", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = setDescriptor(draft, 7, 5, "x");

    // Assert
    expect(next).toEqual(draft);
  });
});

describe("addAspect", () => {
  // Positive: the form keys its editors by id, so a new aspect needs one nobody else has.
  it("gives the added aspect an id that no other aspect has", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = addAspect(draft);

    // Assert
    const ids = next.aspects.map((aspect) => aspect.id);
    expect(ids[2].length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(3);
  });

  it("appends a blank aspect on the LLM path", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = addAspect(draft);

    // Assert
    expect(next.aspects).toHaveLength(3);
    expect(next.aspects[2]).toMatchObject({ name: "", graderPath: "llm", weight: "", definition: "", descriptors: {} });
  });

  it("does not change the draft it was given", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    addAspect(draft);

    // Assert
    expect(draft.aspects).toHaveLength(2);
  });
});

describe("removeAspect", () => {
  // Edge: removing one aspect must not renumber the ids of the ones that stay.
  it("keeps the ids of the aspects that stay", () => {
    // Arrange
    const draft = twoAspects();

    // Act
    const next = removeAspect(draft, 0);

    // Assert
    expect(next.aspects.map((aspect) => aspect.id)).toEqual(["a-2"]);
  });

  it("removes the aspect at the index and keeps the order of the others", () => {
    // Arrange
    const draft = createRubricV1Draft();

    // Act
    const next = removeAspect(draft, 1);

    // Assert
    expect(next.aspects.map((aspect) => aspect.name)).toEqual(["Kesimpulan", "Argumentasi"]);
  });

  // Negative: a version needs at least one aspect, so the last one stays.
  it("keeps the last aspect", () => {
    // Arrange
    const draft = createEmptyDraft();

    // Act
    const next = removeAspect(draft, 0);

    // Assert
    expect(next.aspects).toHaveLength(1);
  });

  it.each([-1, 3, 99])("ignores the index %i that is not an aspect", (index) => {
    // Arrange
    const draft = createRubricV1Draft();

    // Act
    const next = removeAspect(draft, index);

    // Assert
    expect(next.aspects).toHaveLength(3);
  });

  it("does not change the draft it was given", () => {
    // Arrange
    const draft = createRubricV1Draft();

    // Act
    removeAspect(draft, 0);

    // Assert
    expect(draft.aspects).toHaveLength(3);
  });
});

describe("updateLevel", () => {
  it("changes the label and passing mark of the level with that score", () => {
    // Arrange
    const draft = createRubricV1Draft();

    // Act
    const next = updateLevel(draft, 3, { label: "Kurang sekali", isPassing: true });

    // Assert
    expect(next.levels.find((level) => level.score === 3)).toEqual({ score: 3, label: "Kurang sekali", isPassing: true });
    expect(next.levels.find((level) => level.score === 4)).toEqual(draft.levels.find((level) => level.score === 4));
  });

  it("does not change the draft it was given", () => {
    // Arrange
    const draft = createRubricV1Draft();

    // Act
    updateLevel(draft, 3, { label: "Diubah" });

    // Assert
    expect(draft.levels.find((level) => level.score === 3)?.label).toBe("Kurang (Benar, tetapi Dangkal)");
  });

  // Negative: a score that is not on the scale changes nothing; the scale is 0 to 5.
  it("ignores a score that is not one of the levels", () => {
    // Arrange
    const draft = createRubricV1Draft();

    // Act
    const next = updateLevel(draft, 9, { label: "X" });

    // Assert
    expect(next).toEqual(draft);
  });
});
