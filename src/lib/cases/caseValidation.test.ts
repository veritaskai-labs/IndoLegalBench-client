import { describe, expect, it } from "vitest";
import type { CaseFormValues } from "./caseFormMapping";
import { caseFormResolver, flattenErrors, validateCaseForm } from "./caseValidation";

// Minimum a draft needs to be saved: no traps, no answer criteria (AC2).
const draft: CaseFormValues = {
  case_code: "ILB-PT-0142",
  identity: { title: "Pemberitahuan PHK", question: "Wajib?", category: "" },
  legal_refs: [
    { regulation_type: "UU", regulation_number: "13", year: "", pasal: "151", ayat: "", huruf: "" },
  ],
  answer_criteria: { must_contain: "", must_not_contain: "", expected_conclusion: "" },
  traps: [],
  split_tag: "dev",
};

function withRef(overrides: Partial<CaseFormValues["legal_refs"][number]>): CaseFormValues {
  return { ...draft, legal_refs: [{ ...draft.legal_refs[0], ...overrides }] };
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

  it("points at the exact legal reference field", () => {
    const issues = validateCaseForm({
      ...draft,
      legal_refs: [draft.legal_refs[0], { ...draft.legal_refs[0], pasal: "" }],
    });

    expect(issues).toEqual([{ path: "legal_refs.1.pasal", message: "Pasal wajib diisi." }]);
  });

  it("asks for at least one legal reference when the list is empty", () => {
    expect(validateCaseForm({ ...draft, legal_refs: [] })).toEqual([
      { path: "legal_refs", message: "Butuh minimal satu rujukan hukum sampai tingkat pasal." },
    ]);
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
    ["2003.5", "Tahun harus bilangan bulat."],
    ["0", "Tahun minimal 1."],
    ["10000", "Tahun maksimal 9999."],
  ])("rejects year %s", (year, message) => {
    expect(validateCaseForm(withRef({ year }))).toEqual([{ path: "legal_refs.0.year", message }]);
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
  it("nests row errors so react-hook-form finds them by index", async () => {
    const result = await caseFormResolver(withRef({ pasal: "" }), undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.errors).toMatchObject({
      legal_refs: [{ pasal: { type: "client", message: "Pasal wajib diisi." } }],
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
      legal_refs: [undefined, { pasal: { type: "client", message: "Pasal wajib diisi." } }],
    };

    expect(flattenErrors(errors)).toEqual([
      { path: "identity.title", message: "Judul wajib diisi." },
      { path: "legal_refs.1.pasal", message: "Pasal wajib diisi." },
    ]);
  });
});
