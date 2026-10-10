import { describe, expect, it } from "vitest";
import { makeSections as sections } from "@/test/versionFixtures";
import { SECTION_KEYS, describeChanged, sectionLabel, sectionLines } from "./versionSections";

describe("sectionLabel", () => {
  // Positive: every section the server names has a readable label.
  it.each([
    ["identity.title", "Judul"],
    ["identity.question", "Pertanyaan"],
    ["category", "Kategori"],
    ["case_code", "ID kasus"],
    ["split_tag", "Tag dev/test"],
    ["legal_refs", "Rujukan hukum"],
    ["answer_criteria", "Kriteria jawaban"],
    ["traps", "Jebakan"],
  ])("labels %s as %s", (name, expected) => {
    // Arrange / Act
    const label = sectionLabel(name);

    // Assert
    expect(label).toBe(expected);
  });

  // Edge: a section added by a newer server is shown as is instead of disappearing.
  it("returns an unknown section name unchanged", () => {
    // Arrange / Act
    const label = sectionLabel("completeness");

    // Assert
    expect(label).toBe("completeness");
  });

  // Edge: names that exist on every object must not be mistaken for sections.
  it("does not treat inherited object keys as sections", () => {
    // Arrange / Act
    const label = sectionLabel("toString");

    // Assert
    expect(label).toBe("toString");
  });
});

describe("describeChanged", () => {
  // Positive
  it("lists the changed sections by their labels", () => {
    // Arrange / Act
    const text = describeChanged(2, ["category", "legal_refs"]);

    // Assert
    expect(text).toBe("Kategori, Rujukan hukum");
  });

  // Edge: version 1 has no previous version to differ from.
  it("calls version 1 the first version", () => {
    // Arrange / Act
    const text = describeChanged(1, []);

    // Assert
    expect(text).toBe("Versi pertama");
  });

  // Edge: a later version identical to the one before it.
  it("says nothing changed for a later version with an empty list", () => {
    // Arrange / Act
    const text = describeChanged(3, []);

    // Assert
    expect(text).toBe("Tidak ada bagian yang berubah");
  });
});

describe("SECTION_KEYS", () => {
  // Edge: the order is the order of the rows on screen, the same as the server's.
  it("lists the sections in the order the server reports them", () => {
    // Arrange / Act
    const keys = SECTION_KEYS;

    // Assert
    expect(keys).toEqual([
      "identity.title",
      "identity.question",
      "category",
      "case_code",
      "split_tag",
      "legal_refs",
      "answer_criteria",
      "traps",
    ]);
  });
});

describe("sectionLines", () => {
  // Positive
  it("shows plain text sections as one line", () => {
    // Arrange
    const version = sections();

    // Act
    const lines = [
      sectionLines("identity.title", version),
      sectionLines("category", version),
      sectionLines("case_code", version),
      sectionLines("split_tag", version),
    ];

    // Assert
    expect(lines).toEqual([["Pemberitahuan PHK"], ["Ketenagakerjaan"], ["ILB-PT-0142"], ["dev"]]);
  });

  it("writes a legal reference the way lawyers cite it", () => {
    // Arrange
    const version = sections({
      legal_refs: [
        { regulation_type: "UU", regulation_number: "13", year: 2003, pasal: "151", ayat: "3", huruf: "a" },
        { regulation_type: "PP", regulation_number: "35", year: 2021, pasal: "37", ayat: null, huruf: null },
      ],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual([
      "UU No. 13 Tahun 2003, Pasal 151 ayat (3) huruf a",
      "PP No. 35 Tahun 2021, Pasal 37",
    ]);
  });

  it("writes the answer criteria with only the parts that are filled", () => {
    // Arrange
    const version = sections({
      answer_criteria: {
        must_contain: ["Pasal 151", "pemberitahuan tertulis"],
        must_not_contain: [],
        expected_conclusion: "Wajib.",
      },
    });

    // Act
    const lines = sectionLines("answer_criteria", version);

    // Assert
    expect(lines).toEqual(["Wajib ada: Pasal 151; pemberitahuan tertulis", "Kesimpulan: Wajib."]);
  });

  it("numbers the traps and adds the expected behavior when there is one", () => {
    // Arrange
    const version = sections({
      traps: [
        { description: "Sitasi PP yang dicabut", expected_model_behavior: "Menolak sitasi" },
        { description: "Pasal fiktif", expected_model_behavior: null },
      ],
    });

    // Act
    const lines = sectionLines("traps", version);

    // Assert
    expect(lines).toEqual([
      "1. Sitasi PP yang dicabut (perilaku yang diharapkan: Menolak sitasi)",
      "2. Pasal fiktif",
    ]);
  });

  // Edge: nothing filled in.
  it("returns no lines for sections that are empty", () => {
    // Arrange
    const version = sections({ category: null, legal_refs: [], answer_criteria: {}, traps: [] });

    // Act
    const lines = [
      sectionLines("category", version),
      sectionLines("legal_refs", version),
      sectionLines("answer_criteria", version),
      sectionLines("traps", version),
    ];

    // Assert
    expect(lines).toEqual([[], [], [], []]);
  });

  // Edge: the contract types these as unknown, so odd data must not crash the page.
  it("skips legal references, traps and criteria that are not objects", () => {
    // Arrange
    const version = sections({
      legal_refs: ["UU 13", null, 5, {}],
      traps: [null, "x", { description: "   " }, { description: "Sah" }],
      answer_criteria: { must_contain: "bukan daftar", must_not_contain: [1, "", "ok"] },
    });

    // Act
    const refs = sectionLines("legal_refs", version);
    const traps = sectionLines("traps", version);
    const criteria = sectionLines("answer_criteria", version);

    // Assert
    expect(refs).toEqual([]);
    expect(traps).toEqual(["1. Sah"]);
    expect(criteria).toEqual(["Tidak boleh ada: 1; ok"]);
  });

  it("shows nothing for a list section that arrives as a non-list", () => {
    // Arrange
    const broken = sections({ legal_refs: "oops" as unknown as unknown[], traps: undefined as unknown as unknown[] });

    // Act
    const lines = [sectionLines("legal_refs", broken), sectionLines("traps", broken)];

    // Assert
    expect(lines).toEqual([[], []]);
  });
});
