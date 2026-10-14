import { describe, expect, it } from "vitest";
import { makeSnapshotItem } from "@/test/snapshotFixtures";
import { makeSections } from "@/test/versionFixtures";
import { toSnapshotCaseView } from "./snapshotBody";

describe("toSnapshotCaseView", () => {
  // Positive
  it("reads the code, title, version and the eight sections of a frozen case", () => {
    // Arrange
    const item = makeSnapshotItem();

    // Act
    const view = toSnapshotCaseView(item);

    // Assert
    expect(view).toMatchObject({
      caseId: "44444444-4444-4444-4444-444444444444",
      caseCode: "ILB-PT-0142",
      title: "Pemberitahuan PHK",
      versionNo: 2,
    });
    expect(view.sections.map((section) => section.label)).toEqual([
      "Judul",
      "Pertanyaan",
      "Kategori",
      "ID kasus",
      "Tag dev/test",
      "Rujukan hukum",
      "Kriteria jawaban",
      "Jebakan",
    ]);
  });

  it("writes structured sections the same way as the version comparison", () => {
    // Arrange
    const item = makeSnapshotItem({
      body: {
        version_no: 1,
        status: "approved",
        sections: makeSections({
          legal_refs: [{ regulation_type: "UU", regulation_number: "13", year: 2003, pasal: "151" }],
          traps: [{ description: "Pasal fiktif", expected_model_behavior: null }],
        }),
      },
    });

    // Act
    const view = toSnapshotCaseView(item);

    // Assert
    const lines = (key: string) => view.sections.find((section) => section.key === key)?.lines;
    expect(lines("legal_refs")).toEqual(["UU No. 13 Tahun 2003, Pasal 151"]);
    expect(lines("traps")).toEqual(["1. Pasal fiktif"]);
  });

  // Edge: the body is free-form in the contract, so a broken one must not crash.
  it("falls back to placeholders when the body has no sections", () => {
    // Arrange
    const item = makeSnapshotItem({ body: {} });

    // Act
    const view = toSnapshotCaseView(item);

    // Assert
    expect(view.caseCode).toBe("Tanpa ID");
    expect(view.title).toBe("Tanpa judul");
    expect(view.versionNo).toBeNull();
    expect(view.sections).toHaveLength(8);
    expect(view.sections.every((section) => section.lines.length === 0)).toBe(true);
  });

  it.each([
    ["a string", "bukan objek"],
    ["a list", ["x"]],
    ["null", null],
  ])("ignores sections that arrive as %s", (_label, sections) => {
    // Arrange
    const item = makeSnapshotItem({ body: { version_no: 3, sections } });

    // Act
    const view = toSnapshotCaseView(item);

    // Assert
    expect(view.caseCode).toBe("Tanpa ID");
    expect(view.versionNo).toBe(3);
  });

  it("does not trust a version number that is not a number", () => {
    // Arrange
    const item = makeSnapshotItem({ body: { version_no: "2", sections: makeSections() } });

    // Act
    const view = toSnapshotCaseView(item);

    // Assert
    expect(view.versionNo).toBeNull();
  });
});
