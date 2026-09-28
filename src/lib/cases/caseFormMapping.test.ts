import { describe, expect, it } from "vitest";
import {
  emptyCaseFormValues,
  toCaseWritePayload,
  type CaseFormValues,
  type LegalRefFormValues,
} from "./caseFormMapping";

function emptyRef(): LegalRefFormValues {
  return {
    regulation_type: "",
    regulation_number: "",
    year: "",
    pasal: "",
    ayat: "",
    huruf: "",
  };
}

function filledForm(): CaseFormValues {
  return {
    case_code: "ILB-PT-0142",
    identity: {
      title: "Pemberitahuan PHK",
      question: "Apakah pemberitahuan tertulis wajib sebelum PHK?",
      category: "Ketenagakerjaan",
    },
    legal_refs: [
      {
        regulation_type: "UU",
        regulation_number: "13",
        year: "2003",
        pasal: "151",
        ayat: "3",
        huruf: "a",
      },
    ],
    answer_criteria: {
      must_contain: "Pasal 151 ayat (3)\npemberitahuan tertulis",
      must_not_contain: "PP 35/2021 Pasal 37",
      expected_conclusion: "Wajib ada pemberitahuan tertulis.",
    },
    traps: [
      {
        description: "Menyitasi peraturan pelaksana yang sudah dicabut",
        expected_model_behavior: "Menyebut UU 6/2023 sebagai perubahan",
      },
    ],
    split_tag: "dev",
  };
}

describe("toCaseWritePayload", () => {
  // Positive
  it("maps a fully filled form to the CaseWrite body", () => {
    expect(toCaseWritePayload(filledForm())).toEqual({
      case_code: "ILB-PT-0142",
      identity: {
        title: "Pemberitahuan PHK",
        question: "Apakah pemberitahuan tertulis wajib sebelum PHK?",
        category: "Ketenagakerjaan",
      },
      legal_refs: [
        {
          regulation_type: "UU",
          regulation_number: "13",
          year: 2003,
          pasal: "151",
          ayat: "3",
          huruf: "a",
        },
      ],
      answer_criteria: {
        must_contain: ["Pasal 151 ayat (3)", "pemberitahuan tertulis"],
        must_not_contain: ["PP 35/2021 Pasal 37"],
        expected_conclusion: "Wajib ada pemberitahuan tertulis.",
      },
      traps: [
        {
          description: "Menyitasi peraturan pelaksana yang sudah dicabut",
          expected_model_behavior: "Menyebut UU 6/2023 sebagai perubahan",
        },
      ],
      split_tag: "dev",
    });
  });

  it("keeps the test split tag", () => {
    const form = { ...filledForm(), split_tag: "test" as const };
    expect(toCaseWritePayload(form).split_tag).toBe("test");
  });

  // Negative: the client does not block. Invalid input still reaches the
  // server so its 422 decides (CONTRIBUTING §6, SCRUM-109 owns client rules).
  it("sends empty required fields as empty strings instead of dropping them", () => {
    const form = filledForm();
    form.case_code = "";
    form.identity.title = "";
    form.identity.question = "";
    form.legal_refs = [emptyRef()];
    form.traps = [{ description: "", expected_model_behavior: "" }];

    const payload = toCaseWritePayload(form);

    expect(payload.case_code).toBe("");
    expect(payload.identity.title).toBe("");
    expect(payload.identity.question).toBe("");
    expect(payload.legal_refs[0]).toMatchObject({
      regulation_type: "",
      regulation_number: "",
      pasal: "",
    });
    expect(payload.traps?.[0]?.description).toBe("");
  });

  it("sends split_tag as null when no radio is chosen, so the server answers SPLIT_TAG_REQUIRED", () => {
    const form = { ...filledForm(), split_tag: "" as const };
    expect(toCaseWritePayload(form).split_tag).toBeNull();
  });

  it("sends an empty legal_refs list as-is, so the server answers with field legal_refs", () => {
    const form = { ...filledForm(), legal_refs: [] };
    expect(toCaseWritePayload(form).legal_refs).toEqual([]);
  });

  // Corner cases
  it("turns blank optional fields into null", () => {
    const form = filledForm();
    form.identity.category = "";
    form.legal_refs = [
      { ...form.legal_refs[0], year: "", ayat: "", huruf: "" },
    ];
    form.answer_criteria.expected_conclusion = "";
    form.traps = [{ description: "Jebakan", expected_model_behavior: "" }];

    const payload = toCaseWritePayload(form);

    expect(payload.identity.category).toBeNull();
    expect(payload.legal_refs[0]).toMatchObject({
      year: null,
      ayat: null,
      huruf: null,
    });
    expect(payload.answer_criteria?.expected_conclusion).toBeNull();
    expect(payload.traps?.[0]?.expected_model_behavior).toBeNull();
  });

  it("treats whitespace-only optional fields as blank", () => {
    const form = filledForm();
    form.identity.category = "   ";
    form.legal_refs = [{ ...form.legal_refs[0], year: "  ", ayat: " \t" }];

    const payload = toCaseWritePayload(form);

    expect(payload.identity.category).toBeNull();
    expect(payload.legal_refs[0]?.year).toBeNull();
    expect(payload.legal_refs[0]?.ayat).toBeNull();
  });

  it("parses year with surrounding spaces and keeps 0 instead of nulling it", () => {
    const form = filledForm();
    form.legal_refs = [
      { ...form.legal_refs[0], year: " 2003 " },
      { ...form.legal_refs[0], year: "0" },
    ];

    const [first, second] = toCaseWritePayload(form).legal_refs;

    expect(first?.year).toBe(2003);
    // 0 is out of range on the server (ge=1); we forward it so the 422 shows.
    expect(second?.year).toBe(0);
  });

  it("keeps legal_refs length and order, including an empty middle row, so server indexes match form rows", () => {
    const form = filledForm();
    const first = { ...form.legal_refs[0], pasal: "1" };
    const third = { ...form.legal_refs[0], pasal: "3" };
    form.legal_refs = [first, emptyRef(), third];

    const refs = toCaseWritePayload(form).legal_refs;

    expect(refs).toHaveLength(3);
    expect(refs.map((ref) => ref.pasal)).toEqual(["1", "", "3"]);
  });

  it("keeps traps length and order", () => {
    const form = filledForm();
    form.traps = [
      { description: "A", expected_model_behavior: "" },
      { description: "", expected_model_behavior: "" },
      { description: "C", expected_model_behavior: "x" },
    ];

    const traps = toCaseWritePayload(form).traps ?? [];

    expect(traps.map((trap) => trap.description)).toEqual(["A", "", "C"]);
  });

  it("sends an empty traps list when the author added none", () => {
    const form = { ...filledForm(), traps: [] };
    expect(toCaseWritePayload(form).traps).toEqual([]);
  });

  it("keeps every row when there are many", () => {
    const form = filledForm();
    form.legal_refs = Array.from({ length: 50 }, (_, i) => ({
      ...emptyRef(),
      pasal: String(i + 1),
    }));

    const refs = toCaseWritePayload(form).legal_refs;

    expect(refs).toHaveLength(50);
    expect(refs[49]?.pasal).toBe("50");
  });

  it("splits phrase lists per line, trims them, and skips blank lines including CRLF", () => {
    const form = filledForm();
    form.answer_criteria.must_contain = "  Pasal 151 \r\n\r\n  pemberitahuan \n   \n";
    form.answer_criteria.must_not_contain = "";

    const criteria = toCaseWritePayload(form).answer_criteria;

    expect(criteria?.must_contain).toEqual(["Pasal 151", "pemberitahuan"]);
    expect(criteria?.must_not_contain).toEqual([]);
  });

  it("does not mutate the form values", () => {
    const form = filledForm();
    const snapshot = structuredClone(form);

    toCaseWritePayload(form);

    expect(form).toEqual(snapshot);
  });

  it("never sends server-owned fields such as status", () => {
    expect(toCaseWritePayload(filledForm())).not.toHaveProperty("status");
  });
});

describe("emptyCaseFormValues", () => {
  it("starts with one blank legal reference row, no traps, and no split tag", () => {
    const values = emptyCaseFormValues();

    expect(values.legal_refs).toEqual([emptyRef()]);
    expect(values.traps).toEqual([]);
    expect(values.split_tag).toBe("");
    expect(values.case_code).toBe("");
  });

  it("returns a fresh object each call so one form cannot change another", () => {
    const first = emptyCaseFormValues();
    first.legal_refs[0].pasal = "151";

    expect(emptyCaseFormValues().legal_refs[0]?.pasal).toBe("");
  });
});
