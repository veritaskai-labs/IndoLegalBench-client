import { describe, expect, it } from "vitest";

import { createEmptyDraft, createRubricV1Draft } from "./rubricDraft";

const SCORES = [5, 4, 3, 2, 1, 0];

describe("createRubricV1Draft (AC7: isi awal versi 1 dari dokumen klien, 27 Okt 2026)", () => {
  // Positive: tiga dimensi dokumen, urut seperti kolom tabelnya.
  it("has the three dimensions of the client rubric in document order", () => {
    // Arrange / Act
    const draft = createRubricV1Draft();

    // Assert
    expect(draft.aspects.map((aspect) => aspect.name)).toEqual(["Kesimpulan", "Dasar Hukum", "Argumentasi"]);
  });

  // Positive: skala 0-5, lulus hanya 4 dan 5 (klien No. 48).
  it("has six levels where only 4 and 5 pass", () => {
    // Arrange / Act
    const draft = createRubricV1Draft();

    // Assert
    expect(draft.levels.map((level) => [level.score, level.isPassing])).toEqual([
      [5, true],
      [4, true],
      [3, false],
      [2, false],
      [1, false],
      [0, false],
    ]);
  });

  it("names each level as the client document does", () => {
    // Arrange / Act
    const draft = createRubricV1Draft();

    // Assert
    expect(draft.levels.map((level) => level.label)).toEqual([
      "Sempurna dan Komprehensif",
      "Baik (Ada Kekurangan Minor)",
      "Kurang (Benar, tetapi Dangkal)",
      "Berisiko (Kesimpulan Kebetulan Benar, Penalaran Cacat)",
      "Sangat Kurang (Meleset dan Terlalu Umum)",
      "Fatal (Halusinasi atau Menyesatkan)",
    ]);
  });

  it("carries the document wording for a level of each dimension", () => {
    // Arrange / Act
    const draft = createRubricV1Draft();
    const [kesimpulan, dasarHukum, argumentasi] = draft.aspects;

    // Assert
    expect(kesimpulan.descriptors[5]).toBe("AI memberikan jawaban yang sepenuhnya benar dan tepat sasaran.");
    expect(dasarHukum.descriptors[0]).toBe(
      "AI mengarang pasal fiktif (halusinasi hukum) atau menggunakan undang-undang dari negara lain tanpa peringatan.",
    );
    expect(argumentasi.descriptors[2]).toContain("kebetulan atau hasil dari asumsi liar");
  });

  // Edge: every dimension has a descriptor for every level, none blank.
  it("gives every dimension a non-blank descriptor for all six scores", () => {
    // Arrange / Act
    const draft = createRubricV1Draft();

    // Assert
    for (const aspect of draft.aspects) {
      expect(Object.keys(aspect.descriptors).map(Number).sort()).toEqual([...SCORES].sort());
      for (const score of SCORES) expect(aspect.descriptors[score].trim()).not.toBe("");
    }
  });

  // The assumption confirmed with Aileen: the LLM judge grades quality, and no weights in the document.
  it("puts every dimension on the LLM path with no weight", () => {
    // Arrange / Act
    const draft = createRubricV1Draft();

    // Assert
    expect(draft.aspects.map((aspect) => [aspect.graderPath, aspect.weight])).toEqual([
      ["llm", ""],
      ["llm", ""],
      ["llm", ""],
    ]);
  });

  // Negative: nothing the document does not state is made up. The server rejects blanks (422).
  it("leaves approver, dates, prompts and aspect definitions empty for the Admin", () => {
    // Arrange / Act
    const draft = createRubricV1Draft();

    // Assert
    expect(draft).toMatchObject({
      effectiveDate: "",
      approvedByName: "",
      approvedAt: "",
      judgePromptQuality: "",
      judgePromptFormat: "",
    });
    expect(draft.aspects.map((aspect) => aspect.definition)).toEqual(["", "", ""]);
  });

  // Edge: the form edits the draft in place; one draft must not leak into the next.
  it("returns a fresh draft on every call", () => {
    // Arrange
    const first = createRubricV1Draft();

    // Act
    first.aspects[0].name = "Diubah";
    first.aspects[0].descriptors[5] = "Diubah";
    first.levels[0].label = "Diubah";
    const second = createRubricV1Draft();

    // Assert
    expect(second.aspects[0].name).toBe("Kesimpulan");
    expect(second.aspects[0].descriptors[5]).toBe("AI memberikan jawaban yang sepenuhnya benar dan tepat sasaran.");
    expect(second.levels[0].label).toBe("Sempurna dan Komprehensif");
  });
});

describe("createEmptyDraft (form versi baru tanpa template)", () => {
  // Positive: the form always has the 0-5 scale to fill, pass line as the client set it.
  it("starts with six unnamed levels, 4 and 5 marked as passing", () => {
    // Arrange / Act
    const draft = createEmptyDraft();

    // Assert
    expect(draft.levels.map((level) => [level.score, level.label, level.isPassing])).toEqual([
      [5, "", true],
      [4, "", true],
      [3, "", false],
      [2, "", false],
      [1, "", false],
      [0, "", false],
    ]);
  });

  // Edge: a version needs at least one aspect, so the form opens with one blank row on the LLM path.
  it("starts with one blank aspect on the LLM path", () => {
    // Arrange / Act
    const draft = createEmptyDraft();

    // Assert
    expect(draft.aspects).toHaveLength(1);
    expect(draft.aspects[0]).toMatchObject({ name: "", graderPath: "llm", weight: "", definition: "", descriptors: {} });
  });

  // Negative: the text fields are blank, not prefilled with anything.
  it("leaves every text field empty", () => {
    // Arrange / Act
    const draft = createEmptyDraft();

    // Assert
    expect(draft).toMatchObject({
      effectiveDate: "",
      approvedByName: "",
      approvedAt: "",
      judgePromptQuality: "",
      judgePromptFormat: "",
    });
  });

  it("returns a fresh draft on every call", () => {
    // Arrange
    const first = createEmptyDraft();

    // Act
    first.aspects[0].name = "Diubah";
    first.levels[0].label = "Diubah";
    const second = createEmptyDraft();

    // Assert
    expect(second.aspects[0].name).toBe("");
    expect(second.levels[0].label).toBe("");
  });
});

describe("aspect ids (stable keys for the form)", () => {
  // Positive: the form needs an identity per aspect that survives removing another one.
  it("gives every aspect of the v1 template its own non-empty id", () => {
    // Arrange / Act
    const ids = createRubricV1Draft().aspects.map((aspect) => aspect.id);

    // Assert
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it("gives the blank aspect of the empty draft an id", () => {
    // Arrange / Act
    const [aspect] = createEmptyDraft().aspects;

    // Assert
    expect(aspect.id.length).toBeGreaterThan(0);
  });

  // Edge: ids do not repeat across drafts, so an aspect of an old draft never matches a new one.
  it("never repeats an id between two drafts", () => {
    // Arrange
    const first = createRubricV1Draft().aspects.map((aspect) => aspect.id);

    // Act
    const second = createRubricV1Draft().aspects.map((aspect) => aspect.id);

    // Assert
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });
});
