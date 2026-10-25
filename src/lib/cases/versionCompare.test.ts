import { describe, expect, it } from "vitest";
import { makeCompare, makeSections, makeSide } from "@/test/versionFixtures";
import { COMPARE_SECTION_KEYS, changeSummary, compareLines, markedSectionLines } from "./versionCompare";

describe("COMPARE_SECTION_KEYS", () => {
  // K-05: the case code is locked once a version is approved, so two versions never differ there.
  it("leaves out the case code", () => {
    // Arrange / Act / Assert
    expect(COMPARE_SECTION_KEYS).not.toContain("case_code");
  });

  it("keeps every other section in display order", () => {
    // Arrange / Act / Assert
    expect(COMPARE_SECTION_KEYS).toEqual([
      "identity.title",
      "identity.question",
      "category",
      "split_tag",
      "legal_refs",
      "answer_criteria",
      "traps",
    ]);
  });
});

describe("changeSummary", () => {
  // Edge: two identical versions.
  it("says nothing changed when the list is empty", () => {
    // Arrange / Act
    const summary = changeSummary([]);

    // Assert
    expect(summary).toBe("Tidak ada bagian yang berubah di antara kedua versi.");
  });

  // Positive: one section.
  it("names a single changed section", () => {
    // Arrange / Act
    const summary = changeSummary(["category"]);

    // Assert
    expect(summary).toBe("1 bagian berubah: Kategori.");
  });

  // Positive: several sections, listed in table order whatever order the server sends.
  it("names several changed sections in table order", () => {
    // Arrange / Act
    const summary = changeSummary(["traps", "identity.title", "legal_refs"]);

    // Assert
    expect(summary).toBe("3 bagian berubah: Judul, Rujukan hukum, Pengurang Poin.");
  });

  // Negative: the case code is not a compare row, so it is not counted either.
  it("ignores the case code", () => {
    // Arrange / Act
    const summary = changeSummary(["case_code"]);

    // Assert
    expect(summary).toBe("Tidak ada bagian yang berubah di antara kedua versi.");
  });

  // Edge: a section added by a newer server is still reported, with its raw name, after the known ones.
  it("keeps an unknown section at the end with its raw name", () => {
    // Arrange / Act
    const summary = changeSummary(["completeness", "category"]);

    // Assert
    expect(summary).toBe("2 bagian berubah: Kategori, completeness.");
  });

  // Edge: a repeated name is counted once.
  it("counts a repeated name once", () => {
    // Arrange / Act
    const summary = changeSummary(["category", "category"]);

    // Assert
    expect(summary).toBe("1 bagian berubah: Kategori.");
  });
});

describe("compareLines", () => {
  // Positive: one line replaced by another.
  it("marks a line that is only in one version", () => {
    // Arrange / Act
    const marked = compareLines(["UU No. 13 Tahun 2003"], ["UU No. 6 Tahun 2023"]);

    // Assert
    expect(marked.a).toEqual([{ text: "UU No. 13 Tahun 2003", mark: "only_a" }]);
    expect(marked.b).toEqual([{ text: "UU No. 6 Tahun 2023", mark: "only_b" }]);
  });

  // Positive: an added line among shared ones.
  it("marks shared lines as in both versions and only the new one as different", () => {
    // Arrange / Act
    const marked = compareLines(["Pasal 151", "Pasal 156"], ["Pasal 151", "Pasal 156", "Pasal 160"]);

    // Assert
    expect(marked.a.map((line) => line.mark)).toEqual(["both", "both"]);
    expect(marked.b.map((line) => line.mark)).toEqual(["both", "both", "only_b"]);
  });

  // Edge: the same lines in another order are not a content difference.
  it("treats reordered lines as present in both versions", () => {
    // Arrange / Act
    const marked = compareLines(["satu", "dua"], ["dua", "satu"]);

    // Assert
    expect([...marked.a, ...marked.b].every((line) => line.mark === "both")).toBe(true);
  });

  // Edge: duplicates are matched one to one, so a second copy shows as extra.
  it("matches duplicate lines one to one", () => {
    // Arrange / Act
    const marked = compareLines(["sama"], ["sama", "sama"]);

    // Assert
    expect(marked.a).toEqual([{ text: "sama", mark: "both" }]);
    expect(marked.b).toEqual([
      { text: "sama", mark: "both" },
      { text: "sama", mark: "only_b" },
    ]);
  });

  // Edge: a section empty in one version.
  it("marks every line of the filled side when the other side is empty", () => {
    // Arrange / Act
    const marked = compareLines([], ["baru"]);

    // Assert
    expect(marked.a).toEqual([]);
    expect(marked.b).toEqual([{ text: "baru", mark: "only_b" }]);
  });

  // Edge: both empty.
  it("returns two empty lists when both sides are empty", () => {
    // Arrange / Act
    const marked = compareLines([], []);

    // Assert
    expect(marked).toEqual({ a: [], b: [] });
  });

  // Negative: the inputs are not changed.
  it("does not modify the given lists", () => {
    // Arrange
    const a = ["x", "y"];
    const b = ["y"];

    // Act
    compareLines(a, b);

    // Assert
    expect(a).toEqual(["x", "y"]);
    expect(b).toEqual(["y"]);
  });
});

describe("markedSectionLines", () => {
  const result = (changed: string[]) =>
    makeCompare({ b: makeSide(2, { sections: makeSections({ category: "Perburuhan" }) }), changed });

  // Positive: a section the server reports as changed gets line marks.
  it("marks the lines of a section the server reports as changed", () => {
    // Arrange / Act
    const marked = markedSectionLines("category", result(["category"]));

    // Assert
    expect(marked).toEqual({
      a: [{ text: "Ketenagakerjaan", mark: "only_a" }],
      b: [{ text: "Perburuhan", mark: "only_b" }],
    });
  });

  // Negative: the server is the source of truth, so an unreported section is never marked.
  it("leaves every line unmarked when the server reports the section as unchanged", () => {
    // Arrange / Act
    const marked = markedSectionLines("category", result([]));

    // Assert
    expect(marked).toEqual({
      a: [{ text: "Ketenagakerjaan", mark: "both" }],
      b: [{ text: "Perburuhan", mark: "both" }],
    });
  });

  // Edge: an empty section stays empty on both sides.
  it("returns empty lists for a section without content", () => {
    // Arrange / Act
    const marked = markedSectionLines("traps", result(["traps"]));

    // Assert
    expect(marked).toEqual({ a: [], b: [] });
  });
});
