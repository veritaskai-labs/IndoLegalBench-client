import { describe, expect, it } from "vitest";
import { describeChanged, sectionLabel } from "./versionSections";

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
