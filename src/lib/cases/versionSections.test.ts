import { describe, expect, it } from "vitest";
import { makeSections as sections } from "@/test/versionFixtures";
import type { VersionSections } from "@/types/caseVersion";
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
  // Edge: versions saved before traps were retired may still list it as changed.
  it("leaves the retired traps section out of the list", () => {
    // Arrange / Act
    const text = describeChanged(2, ["traps", "category"]);

    // Assert
    expect(text).toBe("Kategori");
  });

  it("says nothing changed when traps was the only change", () => {
    // Arrange / Act
    const text = describeChanged(2, ["traps"]);

    // Assert
    expect(text).toBe("Tidak ada bagian yang berubah");
  });

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
    ]);
  });

  // AC2 SCRUM-257: no section for the retired trap field.
  it("has no section for traps", () => {
    // Arrange / Act / Assert
    expect(SECTION_KEYS).not.toContain("traps");
  });
});

describe("sections of a legacy snapshot that still holds traps", () => {
  // Edge: old snapshots keep traps in their JSON, the page must neither show nor trip over it.
  it("shows no line from the leftover traps in any section", () => {
    // Arrange
    const legacy = sections({
      traps: [{ description: "Sitasi PP yang dicabut", expected_model_behavior: "Menolak" }],
    } as Partial<VersionSections>);

    // Act
    const lines = SECTION_KEYS.flatMap((key) => sectionLines(key, legacy));

    // Assert
    expect(lines.join(" ")).not.toContain("Sitasi PP yang dicabut");
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

  // Edge: nothing filled in.
  it("returns no lines for sections that are empty", () => {
    // Arrange
    const version = sections({ category: null, legal_refs: [], answer_criteria: {} });

    // Act
    const lines = [
      sectionLines("category", version),
      sectionLines("legal_refs", version),
      sectionLines("answer_criteria", version),
    ];

    // Assert
    expect(lines).toEqual([[], [], []]);
  });

  // Edge: the contract types these as unknown, so odd data must not crash the page.
  it("skips legal references and criteria that are not objects", () => {
    // Arrange
    const version = sections({
      legal_refs: ["UU 13", null, 5, {}],
      answer_criteria: { must_contain: "bukan daftar", must_not_contain: [1, "", "ok"] },
    });

    // Act
    const refs = sectionLines("legal_refs", version);
    const criteria = sectionLines("answer_criteria", version);

    // Assert
    expect(refs).toEqual([]);
    expect(criteria).toEqual(["Tidak boleh ada: 1; ok"]);
  });

  it("shows nothing for a list section that arrives as a non-list", () => {
    // Arrange
    const broken = sections({ legal_refs: "oops" as unknown as unknown[] });

    // Act
    const lines = [sectionLines("legal_refs", broken)];

    // Assert
    expect(lines).toEqual([[]]);
  });
});

describe("sectionLines for legal references of the new shape (PBI-21)", () => {
  const CHAIN_TEXT = "Pasal 156 UU 13/2003 jo. Pasal II Angka 5 UU 6/2023";
  const PLACEHOLDER = "Rujukan terstruktur, teks penulisannya belum tersedia di tampilan ini.";

  // Positive: the server writes the citation, the client only shows it.
  it("shows the text the server wrote for a citation", () => {
    // Arrange
    const version = sections({
      legal_refs: [
        {
          kind: "structured",
          free_text: null,
          display_text: CHAIN_TEXT,
          links: [{ form: "pasal" }],
        },
      ],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual([CHAIN_TEXT]);
  });

  it("prefers the text of the server over the old fields of the same citation", () => {
    // Arrange
    const version = sections({
      legal_refs: [
        {
          regulation_type: "uu",
          regulation_number: "13",
          year: 2003,
          pasal: "156",
          display_text: "Pasal 156 UU 13/2003",
        },
      ],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual(["Pasal 156 UU 13/2003"]);
  });

  it("shows free text as it was typed", () => {
    // Arrange
    const version = sections({
      legal_refs: [{ kind: "free_text", free_text: "Putusan MA 12 K/Pdt/2020", links: [] }],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual(["Putusan MA 12 K/Pdt/2020"]);
  });

  it("keeps old and new citations side by side in their order", () => {
    // Arrange
    const version = sections({
      legal_refs: [
        {
          regulation_type: "UU",
          regulation_number: "13",
          year: 2003,
          pasal: "151",
          ayat: null,
          huruf: null,
        },
        { kind: "structured", free_text: null, display_text: CHAIN_TEXT, links: [] },
      ],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual(["UU No. 13 Tahun 2003, Pasal 151", CHAIN_TEXT]);
  });

  // Negative: never hide a citation that is there.
  it("says a structured citation is there when the server sent no text for it", () => {
    // Arrange
    const version = sections({
      legal_refs: [
        { kind: "structured", free_text: null, links: [{ form: "pasal", pasal: "156" }] },
      ],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual([PLACEHOLDER]);
  });

  it("treats a blank server text like a missing one", () => {
    // Arrange
    const version = sections({
      legal_refs: [{ kind: "structured", free_text: null, display_text: "   ", links: [] }],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual([PLACEHOLDER]);
  });

  // Edge
  it("skips free text that is blank", () => {
    // Arrange
    const version = sections({
      legal_refs: [{ kind: "free_text", free_text: "   ", links: [] }],
    });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual([]);
  });

  it("skips an entry that has no kind and none of the old fields", () => {
    // Arrange
    const version = sections({ legal_refs: [{ links: [] }, { display_text: 5 }] });

    // Act
    const lines = sectionLines("legal_refs", version);

    // Assert
    expect(lines).toEqual([]);
  });
});
