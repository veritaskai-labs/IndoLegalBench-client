import { describe, expect, it } from "vitest";
import {
  canRemoveLink,
  chainedLink,
  changeLinkForm,
  CONNECTOR_OPTIONS,
  needsFreeTextConfirm,
  changeRefMode,
  emptyLegalRef,
  emptyLink,
  LINK_FORM_OPTIONS,
  REF_MODE_OPTIONS,
  refMode,
  visibleLinkFields,
  type LegalRefFormValues,
  type LegalRefLinkFormValues,
} from "./legalRefForm";

function filledLink(overrides: Partial<LegalRefLinkFormValues> = {}): LegalRefLinkFormValues {
  return {
    ...emptyLink("pasal_angka"),
    regulation_type: "uu",
    number: "13",
    year: "2003",
    about: "Ketenagakerjaan",
    pasal: "156",
    angka: "5",
    ayat: "1",
    huruf: "a",
    ...overrides,
  };
}

function structuredRef(...links: LegalRefLinkFormValues[]): LegalRefFormValues {
  return { kind: "structured", free_text: "", links };
}

describe("visibleLinkFields", () => {
  it("shows no extra field for a name-only link", () => {
    // Act
    const fields = visibleLinkFields("name_only");

    // Assert
    expect(fields).toEqual([]);
  });

  it("shows pasal, ayat and huruf for a pasal link", () => {
    // Act
    const fields = visibleLinkFields("pasal");

    // Assert
    expect(fields).toEqual(["pasal", "ayat", "huruf"]);
  });

  it("adds angka right after pasal for a pasal-and-angka link", () => {
    // Act
    const fields = visibleLinkFields("pasal_angka");

    // Assert
    expect(fields).toEqual(["pasal", "angka", "ayat", "huruf"]);
  });
});

describe("form options", () => {
  it("offers the four forms of AC4 in order, free text last", () => {
    // Act
    const options = REF_MODE_OPTIONS;

    // Assert
    expect(options).toEqual([
      { value: "name_only", label: "Nama Peraturan saja" },
      { value: "pasal", label: "Pasal" },
      { value: "pasal_angka", label: "Pasal + Angka" },
      { value: "free_text", label: "Teks Bebas" },
    ]);
  });

  it("does not offer free text for a chained link", () => {
    // Act
    const values = LINK_FORM_OPTIONS.map((option) => option.value);

    // Assert
    expect(values).toEqual(["name_only", "pasal", "pasal_angka"]);
  });
});

describe("emptyLink", () => {
  it("starts as a pasal link without connector and with every field empty", () => {
    // Act
    const link = emptyLink();

    // Assert
    expect(link).toEqual({
      form: "pasal",
      connector: "none",
      regulation_type: "",
      number: "",
      year: "",
      about: "",
      pasal: "",
      angka: "",
      ayat: "",
      huruf: "",
    });
  });

  it("takes the form and connector it is given", () => {
    // Act
    const link = emptyLink("name_only", "jo");

    // Assert
    expect(link.form).toBe("name_only");
    expect(link.connector).toBe("jo");
  });
});

describe("emptyLegalRef", () => {
  it("is a structured reference with one empty pasal link", () => {
    // Act
    const ref = emptyLegalRef();

    // Assert
    expect(ref).toEqual({ kind: "structured", free_text: "", links: [emptyLink("pasal")] });
  });

  it("returns a new object each time", () => {
    // Act
    const first = emptyLegalRef();
    const second = emptyLegalRef();

    // Assert
    expect(first).not.toBe(second);
    expect(first.links[0]).not.toBe(second.links[0]);
  });
});

describe("refMode", () => {
  it("is the form of the first link for a structured reference", () => {
    // Arrange
    const ref = structuredRef(emptyLink("pasal_angka"), emptyLink("pasal", "jo"));

    // Act
    const mode = refMode(ref);

    // Assert
    expect(mode).toBe("pasal_angka");
  });

  it("is free_text for a free text reference", () => {
    // Arrange
    const ref: LegalRefFormValues = { kind: "free_text", free_text: "Putusan MA", links: [] };

    // Act
    const mode = refMode(ref);

    // Assert
    expect(mode).toBe("free_text");
  });

  it("falls back to pasal for a structured reference without links", () => {
    // Arrange
    const ref = structuredRef();

    // Act
    const mode = refMode(ref);

    // Assert
    expect(mode).toBe("pasal");
  });
});

describe("changeLinkForm", () => {
  it("clears pasal, angka, ayat and huruf when the link becomes name only", () => {
    // Arrange
    const link = filledLink();

    // Act
    const result = changeLinkForm(link, "name_only");

    // Assert
    expect(result).toMatchObject({ form: "name_only", pasal: "", angka: "", ayat: "", huruf: "" });
  });

  it("keeps the regulation, connector and about when the form changes", () => {
    // Arrange
    const link = filledLink({ connector: "jo" });

    // Act
    const result = changeLinkForm(link, "name_only");

    // Assert
    expect(result).toMatchObject({
      connector: "jo",
      regulation_type: "uu",
      number: "13",
      year: "2003",
      about: "Ketenagakerjaan",
    });
  });

  it("clears only angka when pasal and angka becomes pasal", () => {
    // Arrange
    const link = filledLink();

    // Act
    const result = changeLinkForm(link, "pasal");

    // Assert
    expect(result).toMatchObject({ form: "pasal", pasal: "156", angka: "", ayat: "1", huruf: "a" });
  });

  it("keeps pasal, ayat and huruf when pasal becomes pasal and angka", () => {
    // Arrange
    const link = filledLink({ form: "pasal", angka: "" });

    // Act
    const result = changeLinkForm(link, "pasal_angka");

    // Assert
    expect(result).toMatchObject({
      form: "pasal_angka",
      pasal: "156",
      angka: "",
      ayat: "1",
      huruf: "a",
    });
  });

  it("changes nothing when the form is the same", () => {
    // Arrange
    const link = filledLink();

    // Act
    const result = changeLinkForm(link, "pasal_angka");

    // Assert
    expect(result).toEqual(link);
  });

  it("does not modify the link it was given", () => {
    // Arrange
    const link = filledLink();

    // Act
    changeLinkForm(link, "name_only");

    // Assert
    expect(link.pasal).toBe("156");
    expect(link.form).toBe("pasal_angka");
  });
});

describe("changeRefMode", () => {
  it("turns a structured reference into free text and drops its links", () => {
    // Arrange
    const ref = structuredRef(filledLink(), filledLink({ connector: "jo" }));

    // Act
    const result = changeRefMode(ref, "free_text");

    // Assert
    expect(result).toEqual({ kind: "free_text", free_text: "", links: [] });
  });

  it("keeps the typed free text when staying in free text", () => {
    // Arrange
    const ref: LegalRefFormValues = { kind: "free_text", free_text: "Putusan MA", links: [] };

    // Act
    const result = changeRefMode(ref, "free_text");

    // Assert
    expect(result).toEqual(ref);
  });

  it("starts one empty link of the chosen form when free text becomes structured", () => {
    // Arrange
    const ref: LegalRefFormValues = { kind: "free_text", free_text: "Putusan MA", links: [] };

    // Act
    const result = changeRefMode(ref, "pasal_angka");

    // Assert
    expect(result).toEqual({
      kind: "structured",
      free_text: "",
      links: [emptyLink("pasal_angka")],
    });
  });

  it("changes only the first link when the form changes inside a structured reference", () => {
    // Arrange
    const second = filledLink({ connector: "jo", form: "pasal", angka: "" });
    const ref = structuredRef(filledLink(), second);

    // Act
    const result = changeRefMode(ref, "name_only");

    // Assert
    expect(result.kind).toBe("structured");
    expect(result.links[0]).toMatchObject({ form: "name_only", pasal: "", angka: "" });
    expect(result.links[1]).toEqual(second);
  });

  it("starts one empty link when a structured reference has none", () => {
    // Arrange
    const ref = structuredRef();

    // Act
    const result = changeRefMode(ref, "name_only");

    // Assert
    expect(result).toEqual({
      kind: "structured",
      free_text: "",
      links: [emptyLink("name_only")],
    });
  });

  it("changes nothing when the mode is the same", () => {
    // Arrange
    const ref = structuredRef(filledLink());

    // Act
    const result = changeRefMode(ref, "pasal_angka");

    // Assert
    expect(result).toEqual(ref);
  });

  it("does not modify the reference it was given", () => {
    // Arrange
    const ref = structuredRef(filledLink());

    // Act
    changeRefMode(ref, "free_text");

    // Assert
    expect(ref.kind).toBe("structured");
    expect(ref.links).toHaveLength(1);
  });
});

describe("chaining regulations (AC6, SCRUM-162)", () => {
  // Positif
  it("offers jo. and jis. as connectors, in that order", () => {
    expect(CONNECTOR_OPTIONS).toEqual([
      { value: "jo", label: "jo." },
      { value: "jis", label: "jis." },
    ]);
  });

  it("starts a chained regulation as an empty Pasal link joined with jo. (PO decision 5)", () => {
    expect(chainedLink()).toEqual(emptyLink("pasal", "jo"));
  });

  it("returns a fresh link each time, so two chained links never share state", () => {
    expect(chainedLink()).not.toBe(chainedLink());
  });

  it("lets the Author remove the second and later regulations", () => {
    expect([1, 2, 5].map(canRemoveLink)).toEqual([true, true, true]);
  });

  // Negatif
  it("never removes the first regulation of a citation", () => {
    expect(canRemoveLink(0)).toBe(false);
  });
});

describe("needsFreeTextConfirm", () => {
  // Positif
  it("asks before Teks Bebas drops a chain of two or more regulations (PO decision 8)", () => {
    expect(needsFreeTextConfirm(structuredRef(filledLink(), filledLink()), "free_text")).toBe(true);
  });

  // Negatif
  it("does not ask for a single regulation", () => {
    expect(needsFreeTextConfirm(structuredRef(filledLink()), "free_text")).toBe(false);
  });

  it("does not ask when the new form is not Teks Bebas", () => {
    expect(needsFreeTextConfirm(structuredRef(filledLink(), filledLink()), "pasal")).toBe(false);
  });

  // Edge
  it("does not ask when the citation is already Teks Bebas", () => {
    const ref: LegalRefFormValues = { kind: "free_text", free_text: "Format teks bebas", links: [] };

    expect(needsFreeTextConfirm(ref, "free_text")).toBe(false);
  });
});
