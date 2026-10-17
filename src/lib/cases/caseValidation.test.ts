import { describe, expect, it } from "vitest";
import type { CaseFormValues } from "./caseFormMapping";
import { caseFormResolver, flattenErrors, validateCaseForm } from "./caseValidation";
import { emptyLink, type LegalRefLinkFormValues } from "./legalRefForm";

function link(overrides: Partial<LegalRefLinkFormValues> = {}): LegalRefLinkFormValues {
  return {
    ...emptyLink("pasal"),
    regulation_type: "uu",
    number: "13",
    year: "2003",
    pasal: "151",
    ...overrides,
  };
}

// Minimum a draft needs to be saved: no traps, no answer criteria (AC2).
const draft: CaseFormValues = {
  case_code: "ILB-PT-0142",
  identity: { title: "Pemberitahuan PHK", question: "Wajib?", category: "" },
  legal_refs: [{ kind: "structured", free_text: "", links: [link()] }],
  answer_criteria: { must_contain: "", must_not_contain: "", expected_conclusion: "" },
  traps: [],
  split_tag: "dev",
};

/** Satu rujukan terstruktur dengan satu link yang sebagian isinya diganti. */
function withLink(overrides: Partial<LegalRefLinkFormValues>): CaseFormValues {
  return {
    ...draft,
    legal_refs: [{ kind: "structured", free_text: "", links: [link(overrides)] }],
  };
}

function withFreeText(freeText: string): CaseFormValues {
  return { ...draft, legal_refs: [{ kind: "free_text", free_text: freeText, links: [] }] };
}

describe("validateCaseForm", () => {
  // Positive: AC2, a draft without traps or criteria is valid to save.
  it("accepts a draft with no traps and no answer criteria", () => {
    expect(validateCaseForm(draft)).toEqual([]);
  });

  // Negative
  it("says an empty required field is wajib diisi, not too short", () => {
    expect(validateCaseForm({ ...draft, case_code: "" })).toEqual([
      { path: "case_code", message: "ID kasus wajib diisi." },
    ]);
  });

  it("treats a title of only spaces as empty, like the server does", () => {
    const issues = validateCaseForm({ ...draft, identity: { ...draft.identity, title: "   " } });

    expect(issues).toEqual([{ path: "identity.title", message: "Judul wajib diisi." }]);
  });

  it("explains the case code pattern", () => {
    expect(validateCaseForm({ ...draft, case_code: "-PHK" })[0]?.message).toMatch(
      /^ID kasus diawali huruf atau angka/,
    );
  });

  it("points at the exact field of the exact link of the exact legal reference", () => {
    // Arrange
    const second = { kind: "structured" as const, free_text: "", links: [link({ number: "" })] };
    const form = { ...draft, legal_refs: [draft.legal_refs[0], second] };

    // Act
    const issues = validateCaseForm(form);

    // Assert
    expect(issues).toEqual([
      { path: "legal_refs.1.links.0.number", message: "Nomor peraturan wajib diisi." },
    ]);
  });

  it("points at a later link of a chain", () => {
    // Arrange
    const chain = {
      kind: "structured" as const,
      free_text: "",
      links: [link(), link({ connector: "jo", regulation_type: "" })],
    };

    // Act
    const issues = validateCaseForm({ ...draft, legal_refs: [chain] });

    // Assert
    expect(issues).toEqual([
      { path: "legal_refs.0.links.1.regulation_type", message: "Jenis peraturan wajib diisi." },
    ]);
  });

  it("asks for at least one legal reference when the list is empty", () => {
    // Act
    const issues = validateCaseForm({ ...draft, legal_refs: [] });

    // Assert
    expect(issues).toEqual([{ path: "legal_refs", message: "Butuh minimal satu rujukan hukum." }]);
  });

  it("leaves the rules that depend on the form to the server", () => {
    // Arrange: a pasal link without pasal, and a pasal-and-angka link without angka
    const form = {
      ...draft,
      legal_refs: [
        {
          kind: "structured" as const,
          free_text: "",
          links: [link({ pasal: "" }), link({ form: "pasal_angka", connector: "jo", angka: "" })],
        },
      ],
    };

    // Act
    const issues = validateCaseForm(form);

    // Assert: the contract cannot say "needs pasal for this form", so the server answers
    expect(issues).toEqual([]);
  });

  it("does not ask for free text, the server decides whether it is blank", () => {
    // Act
    const issues = validateCaseForm(withFreeText(""));

    // Assert
    expect(issues).toEqual([]);
  });

  it("rejects a trap row without a description instead of dropping it", () => {
    const issues = validateCaseForm({
      ...draft,
      traps: [{ description: "", expected_model_behavior: "Menolak" }],
    });

    expect(issues).toEqual([{ path: "traps.0.description", message: "Deskripsi jebakan wajib diisi." }]);
  });

  it("asks to pick a split tag", () => {
    expect(validateCaseForm({ ...draft, split_tag: "" })).toEqual([
      { path: "split_tag", message: "Pilih tag dev atau test." },
    ]);
  });

  // Corner: boundaries come from the contract.
  it.each([
    ["", "Tahun wajib diisi."],
    ["  ", "Tahun wajib diisi."],
    ["2003.5", "Tahun harus bilangan bulat."],
    ["0", "Tahun minimal 1."],
    ["10000", "Tahun maksimal 9999."],
  ])("rejects year %j", (year, message) => {
    // Act
    const issues = validateCaseForm(withLink({ year }));

    // Assert
    expect(issues).toEqual([{ path: "legal_refs.0.links.0.year", message }]);
  });

  it.each(["156", "II", "28D", "81A", "XIV"])("accepts pasal %s", (pasal) => {
    expect(validateCaseForm(withLink({ pasal }))).toEqual([]);
  });

  it.each(["ii", "28d", "0", "IIII", "1AB", "Pasal 1"])("rejects pasal %s", (pasal) => {
    // Act
    const issues = validateCaseForm(withLink({ pasal }));

    // Assert
    expect(issues).toEqual([
      { path: "legal_refs.0.links.0.pasal", message: "Format pasal tidak valid." },
    ]);
  });

  it("checks the angka of a pasal-and-angka link against the contract", () => {
    // Arrange
    const valid = withLink({ form: "pasal_angka", angka: "5" });
    const invalid = withLink({ form: "pasal_angka", angka: "5a" });

    // Act
    const result = [validateCaseForm(valid), validateCaseForm(invalid)];

    // Assert
    expect(result[0]).toEqual([]);
    expect(result[1]).toEqual([
      { path: "legal_refs.0.links.0.angka", message: "Format angka tidak valid." },
    ]);
  });

  it("does not check an angka the form does not use", () => {
    // Act
    const issues = validateCaseForm(withLink({ form: "pasal", angka: "bukan angka" }));

    // Assert: the field is hidden, so it is not sent
    expect(issues).toEqual([]);
  });

  it.each([
    [
      { number: "9".repeat(101) },
      "legal_refs.0.links.0.number",
      "Nomor peraturan maksimal 100 karakter.",
    ],
    [{ about: "x".repeat(501) }, "legal_refs.0.links.0.about", "Tentang maksimal 500 karakter."],
  ])("rejects a value over its limit %#", (overrides, path, message) => {
    // Act
    const issues = validateCaseForm(withLink(overrides));

    // Assert
    expect(issues).toEqual([{ path, message }]);
  });

  it("rejects free text over 2000 characters", () => {
    // Act
    const issues = validateCaseForm(withFreeText("x".repeat(2001)));

    // Assert
    expect(issues).toEqual([
      { path: "legal_refs.0.free_text", message: "Teks bebas maksimal 2000 karakter." },
    ]);
  });

  it("accepts a title exactly at the 300 character limit and rejects 301", () => {
    const at = { ...draft, identity: { ...draft.identity, title: "j".repeat(300) } };
    const over = { ...draft, identity: { ...draft.identity, title: "j".repeat(301) } };

    expect(validateCaseForm(at)).toEqual([]);
    expect(validateCaseForm(over)).toEqual([
      { path: "identity.title", message: "Judul maksimal 300 karakter." },
    ]);
  });

  it("reports only the first problem of each field", () => {
    const issues = validateCaseForm({ ...draft, case_code: "x" });

    expect(issues.filter((issue) => issue.path === "case_code")).toHaveLength(1);
  });
});

describe("caseFormResolver", () => {
  it("nests row and link errors so react-hook-form finds them by index", async () => {
    // Act
    const result = await caseFormResolver(withLink({ number: "" }), undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    // Assert
    expect(result.errors).toMatchObject({
      legal_refs: [
        { links: [{ number: { type: "client", message: "Nomor peraturan wajib diisi." } }] },
      ],
    });
    expect(Array.isArray(result.errors.legal_refs)).toBe(true);
  });

  it("passes the values through when the form is valid", async () => {
    const result = await caseFormResolver(draft, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result).toEqual({ values: draft, errors: {} });
  });
});

describe("flattenErrors", () => {
  it("lists browser errors with their paths and skips server errors", () => {
    const errors = {
      case_code: { type: "server", message: "Kode kasus sudah dipakai" },
      identity: { title: { type: "client", message: "Judul wajib diisi.", ref: { focus() {} } } },
      legal_refs: [
        undefined,
        { links: [{ number: { type: "client", message: "Nomor peraturan wajib diisi." } }] },
      ],
    };

    expect(flattenErrors(errors)).toEqual([
      { path: "identity.title", message: "Judul wajib diisi." },
      { path: "legal_refs.1.links.0.number", message: "Nomor peraturan wajib diisi." },
    ]);
  });
});
