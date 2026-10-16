import { describe, expect, it } from "vitest";
import type { CaseRead } from "@/types/case";
import {
  emptyCaseFormValues,
  fromCaseRead,
  toCaseWritePayload,
  type CaseFormValues,
} from "./caseFormMapping";
import {
  emptyLegalRef,
  emptyLink,
  type LegalRefFormValues,
  type LegalRefLinkFormValues,
} from "./legalRefForm";

function pasalLink(overrides: Partial<LegalRefLinkFormValues> = {}): LegalRefLinkFormValues {
  return {
    ...emptyLink("pasal"),
    regulation_type: "uu",
    number: "13",
    year: "2003",
    pasal: "151",
    ayat: "3",
    huruf: "a",
    ...overrides,
  };
}

function structuredRef(...links: LegalRefLinkFormValues[]): LegalRefFormValues {
  return { kind: "structured", free_text: "", links };
}

function filledForm(): CaseFormValues {
  return {
    case_code: "ILB-PT-0142",
    identity: {
      title: "Pemberitahuan PHK",
      question: "Apakah pemberitahuan tertulis wajib sebelum PHK?",
      category: "Ketenagakerjaan",
    },
    legal_refs: [structuredRef(pasalLink())],
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
    // Arrange
    const form = filledForm();

    // Act
    const payload = toCaseWritePayload(form);

    // Assert
    expect(payload).toEqual({
      case_code: "ILB-PT-0142",
      identity: {
        title: "Pemberitahuan PHK",
        question: "Apakah pemberitahuan tertulis wajib sebelum PHK?",
        category: "Ketenagakerjaan",
      },
      legal_refs: [
        {
          kind: "structured",
          free_text: null,
          links: [
            {
              form: "pasal",
              connector: "none",
              regulation_type: "uu",
              number: "13",
              year: 2003,
              about: "",
              pasal: "151",
              angka: null,
              ayat: "3",
              huruf: "a",
            },
          ],
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
    form.legal_refs = [emptyLegalRef()];
    form.traps = [{ description: "", expected_model_behavior: "" }];

    const payload = toCaseWritePayload(form);

    expect(payload.case_code).toBe("");
    expect(payload.identity.title).toBe("");
    expect(payload.identity.question).toBe("");
    expect(payload.legal_refs[0]?.links[0]).toMatchObject({
      regulation_type: "",
      number: "",
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
    form.answer_criteria.expected_conclusion = "";
    form.traps = [{ description: "Jebakan", expected_model_behavior: "" }];

    const payload = toCaseWritePayload(form);

    expect(payload.identity.category).toBeNull();
    expect(payload.answer_criteria?.expected_conclusion).toBeNull();
    expect(payload.traps?.[0]?.expected_model_behavior).toBeNull();
  });

  it("treats a whitespace-only category as blank", () => {
    const form = filledForm();
    form.identity.category = "   ";

    const payload = toCaseWritePayload(form);

    expect(payload.identity.category).toBeNull();
  });

  it("sends the shown link fields as typed, even when blank, and leaves the clean-up to the server", () => {
    // Arrange: the server strips blank text to null before it checks the pattern
    const form = filledForm();
    form.legal_refs = [structuredRef(pasalLink({ about: "", ayat: "", huruf: "" }))];

    // Act
    const link = toCaseWritePayload(form).legal_refs[0]?.links[0];

    // Assert
    expect(link).toMatchObject({ about: "", ayat: "", huruf: "" });
  });

  it("sends whitespace-only link fields untouched instead of deciding for the server", () => {
    // Arrange
    const form = filledForm();
    form.legal_refs = [structuredRef(pasalLink({ about: "  ", ayat: " \t" }))];

    // Act
    const link = toCaseWritePayload(form).legal_refs[0]?.links[0];

    // Assert
    expect(link?.about).toBe("  ");
    expect(link?.ayat).toBe(" \t");
  });

  it("parses year with surrounding spaces and keeps 0 instead of nulling it", () => {
    const form = filledForm();
    form.legal_refs = [
      structuredRef(pasalLink({ year: " 2003 " })),
      structuredRef(pasalLink({ year: "0" })),
    ];

    const [first, second] = toCaseWritePayload(form).legal_refs;

    expect(first?.links[0]?.year).toBe(2003);
    // 0 is out of range on the server (ge=1); we forward it so the 422 shows.
    expect(second?.links[0]?.year).toBe(0);
  });

  it("keeps legal_refs length and order, including an empty middle row, so server indexes match form rows", () => {
    const form = filledForm();
    const first = structuredRef(pasalLink({ pasal: "1" }));
    const third = structuredRef(pasalLink({ pasal: "3" }));
    form.legal_refs = [first, emptyLegalRef(), third];

    const refs = toCaseWritePayload(form).legal_refs;

    expect(refs).toHaveLength(3);
    expect(refs.map((ref) => ref.links[0]?.pasal)).toEqual(["1", "", "3"]);
  });

  it("omits the year when it is blank, so the server answers FIELD_REQUIRED for it", () => {
    // Arrange
    const form = filledForm();
    form.legal_refs = [structuredRef(pasalLink({ year: "" }), pasalLink({ year: "  " }))];

    // Act
    const links = toCaseWritePayload(form).legal_refs[0]?.links ?? [];

    // Assert
    expect(links.map((link) => "year" in link && link.year !== undefined)).toEqual([false, false]);
  });

  it("sends a free text reference as typed, with no links", () => {
    // Arrange
    const form = filledForm();
    form.legal_refs = [
      {
        kind: "free_text",
        free_text: "  Putusan MA No. 12 K/Pdt/2020  ",
        links: [],
      },
    ];

    // Act
    const refs = toCaseWritePayload(form).legal_refs;

    // Assert
    expect(refs).toEqual([
      {
        kind: "free_text",
        free_text: "  Putusan MA No. 12 K/Pdt/2020  ",
        links: [],
      },
    ]);
  });

  it("sends a blank free text as an empty string so the server answers for it", () => {
    // Arrange
    const form = filledForm();
    form.legal_refs = [{ kind: "free_text", free_text: "", links: [] }];

    // Act
    const refs = toCaseWritePayload(form).legal_refs;

    // Assert
    expect(refs[0]).toEqual({ kind: "free_text", free_text: "", links: [] });
  });

  it("drops leftover free text from a structured reference", () => {
    // Arrange
    const form = filledForm();
    form.legal_refs = [{ kind: "structured", free_text: "sisa teks", links: [pasalLink()] }];

    // Act
    const ref = toCaseWritePayload(form).legal_refs[0];

    // Assert
    expect(ref?.free_text).toBeNull();
  });

  it("sends null for the fields a link form does not use, even when stale text is left in them", () => {
    // Arrange
    const form = filledForm();
    form.legal_refs = [
      structuredRef({
        ...emptyLink("name_only"),
        regulation_type: "uu",
        number: "13",
        year: "2003",
        pasal: "99",
        angka: "5",
        ayat: "1",
        huruf: "a",
      }),
    ];

    // Act
    const link = toCaseWritePayload(form).legal_refs[0]?.links[0];

    // Assert
    expect(link).toMatchObject({
      form: "name_only",
      pasal: null,
      angka: null,
      ayat: null,
      huruf: null,
    });
  });

  it("sends angka as typed for a pasal-and-angka link, and an empty angka as an empty string", () => {
    // Arrange
    const form = filledForm();
    form.legal_refs = [
      structuredRef(
        pasalLink({ form: "pasal_angka", angka: "5" }),
        pasalLink({ form: "pasal_angka", angka: "", connector: "jo" }),
      ),
    ];

    // Act
    const links = toCaseWritePayload(form).legal_refs[0]?.links ?? [];

    // Assert
    expect(links.map((link) => link.angka)).toEqual(["5", ""]);
  });

  it("keeps the chain order and sends each link its own form and connector", () => {
    // Arrange: Pasal 156 UU 13/2003 jo. Pasal II Angka 5 UU 6/2023
    const form = filledForm();
    form.legal_refs = [
      structuredRef(
        pasalLink({ pasal: "156", ayat: "", huruf: "" }),
        pasalLink({
          form: "pasal_angka",
          connector: "jo",
          number: "6",
          year: "2023",
          pasal: "II",
          angka: "5",
          ayat: "",
          huruf: "",
        }),
      ),
    ];

    // Act
    const links = toCaseWritePayload(form).legal_refs[0]?.links ?? [];

    // Assert
    expect(links.map((link) => [link.form, link.connector, link.pasal, link.angka])).toEqual([
      ["pasal", "none", "156", null],
      ["pasal_angka", "jo", "II", "5"],
    ]);
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
    form.legal_refs = Array.from({ length: 50 }, (_, i) =>
      structuredRef(pasalLink({ pasal: String(i + 1) })),
    );

    const refs = toCaseWritePayload(form).legal_refs;

    expect(refs).toHaveLength(50);
    expect(refs[49]?.links[0]?.pasal).toBe("50");
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

    expect(values.legal_refs).toEqual([emptyLegalRef()]);
    expect(values.traps).toEqual([]);
    expect(values.split_tag).toBe("");
    expect(values.case_code).toBe("");
  });

  it("returns a fresh object each call so one form cannot change another", () => {
    const first = emptyCaseFormValues();
    first.legal_refs[0].links[0].pasal = "151";

    expect(emptyCaseFormValues().legal_refs[0]?.links[0]?.pasal).toBe("");
  });
});

type SavedLink = CaseRead["legal_refs"][number]["links"][number];

function savedLink(overrides: Partial<SavedLink> = {}): SavedLink {
  return {
    form: "pasal",
    connector: "none",
    regulation_type: "uu",
    number: "13",
    year: 2003,
    about: null,
    pasal: "151",
    angka: null,
    ayat: "3",
    huruf: null,
    ...overrides,
  };
}

function savedCase(overrides: Partial<CaseRead> = {}): CaseRead {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    suite_id: "11111111-1111-1111-1111-111111111111",
    case_code: "ILB-PT-0142",
    identity: {
      title: "Pemberitahuan PHK",
      question: "Apakah pemberitahuan tertulis wajib?",
      category: "Ketenagakerjaan",
    },
    legal_refs: [
      {
        kind: "structured",
        free_text: null,
        display_text: "Pasal 151 ayat (3) UU 13/2003",
        links: [savedLink()],
      },
    ],
    answer_criteria: {
      must_contain: ["Pasal 151 ayat (3)", "pemberitahuan tertulis"],
      must_not_contain: [],
      expected_conclusion: "Wajib.",
    },
    traps: [{ description: "Sitasi PP yang dicabut", expected_model_behavior: null }],
    split_tag: "test",
    status: "draft",
    completeness_pct: 86,
    version: 3,
    created_at: "2026-09-29T00:00:00Z",
    updated_at: "2026-09-29T00:00:00Z",
    ...overrides,
  };
}

describe("fromCaseRead", () => {
  // Positive
  it("fills every form field from a saved case", () => {
    expect(fromCaseRead(savedCase())).toEqual({
      case_code: "ILB-PT-0142",
      identity: {
        title: "Pemberitahuan PHK",
        question: "Apakah pemberitahuan tertulis wajib?",
        category: "Ketenagakerjaan",
      },
      legal_refs: [
        {
          kind: "structured",
          free_text: "",
          links: [
            {
              form: "pasal",
              connector: "none",
              regulation_type: "uu",
              number: "13",
              year: "2003",
              about: "",
              pasal: "151",
              angka: "",
              ayat: "3",
              huruf: "",
            },
          ],
        },
      ],
      answer_criteria: {
        must_contain: "Pasal 151 ayat (3)\npemberitahuan tertulis",
        must_not_contain: "",
        expected_conclusion: "Wajib.",
      },
      traps: [{ description: "Sitasi PP yang dicabut", expected_model_behavior: "" }],
      split_tag: "test",
    });
  });

  it("round-trips: saving an unchanged form sends back the same body", () => {
    const saved = savedCase();
    // A blank optional link field comes back as an empty string, which the server reads as null.
    const legalRefs = saved.legal_refs.map((ref) => ({
      kind: ref.kind,
      free_text: ref.free_text,
      links: ref.links.map((link) => ({
        ...link,
        about: link.about ?? "",
        huruf: link.huruf ?? "",
      })),
    }));

    expect(toCaseWritePayload(fromCaseRead(saved))).toEqual({
      case_code: saved.case_code,
      identity: saved.identity,
      legal_refs: legalRefs,
      answer_criteria: saved.answer_criteria,
      traps: saved.traps,
      split_tag: saved.split_tag,
    });
  });

  // Negative: server-owned fields never reach the form.
  it("leaves out id, status, version, and other server-owned fields", () => {
    const values = fromCaseRead(savedCase());

    for (const key of ["id", "suite_id", "status", "completeness_pct", "version", "created_at"]) {
      expect(values).not.toHaveProperty(key);
    }
  });

  // Corner cases
  it("turns every null into an empty string so inputs stay controlled", () => {
    const values = fromCaseRead(
      savedCase({
        identity: { title: "t", question: "q", category: null },
        legal_refs: [
          {
            kind: "structured",
            free_text: null,
            display_text: "Pasal 151 ayat (3) UU 13/2003",
            links: [
              savedLink({
                year: null,
                about: null,
                pasal: "1",
                ayat: null,
                huruf: null,
              }),
            ],
          },
        ],
        answer_criteria: {
          must_contain: [],
          must_not_contain: [],
          expected_conclusion: null,
        },
      }),
    );

    expect(values.identity.category).toBe("");
    expect(values.legal_refs[0]?.links[0]).toMatchObject({
      year: "",
      about: "",
      angka: "",
      ayat: "",
      huruf: "",
    });
    expect(values.answer_criteria).toEqual({
      must_contain: "",
      must_not_contain: "",
      expected_conclusion: "",
    });
  });

  it("keeps an empty list of legal references empty instead of adding a blank row", () => {
    expect(fromCaseRead(savedCase({ legal_refs: [], traps: [] }))).toMatchObject({
      legal_refs: [],
      traps: [],
    });
  });

  it("treats missing optional answer criteria from the server as empty", () => {
    const values = fromCaseRead(savedCase({ answer_criteria: {} }));

    expect(values.answer_criteria).toEqual({
      must_contain: "",
      must_not_contain: "",
      expected_conclusion: "",
    });
  });

  it("opens a Sprint 1 reference without a year as a structured link with an empty year (AC9)", () => {
    // Arrange
    const saved = savedCase({
      legal_refs: [
        {
          kind: "structured",
          free_text: null,
          display_text: "Pasal 156 UU 13",
          links: [savedLink({ year: null, pasal: "156" })],
        },
      ],
    });

    // Act
    const values = fromCaseRead(saved);

    // Assert
    expect(values.legal_refs[0]?.kind).toBe("structured");
    expect(values.legal_refs[0]?.links[0]).toMatchObject({
      year: "",
      pasal: "156",
      form: "pasal",
    });
  });

  it("opens a reference that was kept as free text with its text and no links", () => {
    // Arrange
    const saved = savedCase({
      legal_refs: [
        {
          kind: "free_text",
          free_text: "Peraturan Gubernur Kuno Nomor 5 Tahun 2001, Pasal 3",
          display_text: "Peraturan Gubernur Kuno Nomor 5 Tahun 2001, Pasal 3",
          links: [],
        },
      ],
    });

    // Act
    const values = fromCaseRead(saved);

    // Assert
    expect(values.legal_refs).toEqual([
      {
        kind: "free_text",
        free_text: "Peraturan Gubernur Kuno Nomor 5 Tahun 2001, Pasal 3",
        links: [],
      },
    ]);
  });

  it("keeps a pasal that is not a plain number, such as an inserted article", () => {
    // Arrange
    const saved = savedCase({
      legal_refs: [
        {
          kind: "structured",
          free_text: null,
          display_text: "Pasal 28D UU 13/2003",
          links: [savedLink({ pasal: "28D" })],
        },
      ],
    });

    // Act
    const values = fromCaseRead(saved);

    // Assert
    expect(values.legal_refs[0]?.links[0]?.pasal).toBe("28D");
  });

  it("keeps the links of a chain in order with their connectors and forms", () => {
    // Arrange
    const saved = savedCase({
      legal_refs: [
        {
          kind: "structured",
          free_text: null,
          display_text: "Pasal 156 UU 13/2003 jo. Pasal II Angka 5 UU 6/2023",
          links: [
            savedLink({ pasal: "156", ayat: null }),
            savedLink({
              form: "pasal_angka",
              connector: "jo",
              number: "6",
              year: 2023,
              pasal: "II",
              angka: "5",
              ayat: null,
            }),
          ],
        },
      ],
    });

    // Act
    const links = fromCaseRead(saved).legal_refs[0]?.links ?? [];

    // Assert
    expect(links.map((link) => [link.form, link.connector, link.pasal, link.angka])).toEqual([
      ["pasal", "none", "156", ""],
      ["pasal_angka", "jo", "II", "5"],
    ]);
  });

  it("does not add a link to a structured reference that has none", () => {
    // Arrange
    const saved = savedCase({
      legal_refs: [{ kind: "structured", free_text: null, display_text: "", links: [] }],
    });

    // Act
    const values = fromCaseRead(saved);

    // Assert
    expect(values.legal_refs[0]?.links).toEqual([]);
  });

  it("keeps row order", () => {
    const refs = ["1", "2", "3"].map((pasal) => ({
      kind: "structured" as const,
      free_text: null,
      display_text: `Pasal ${pasal} UU 13/2003`,
      links: [savedLink({ pasal })],
    }));

    const values = fromCaseRead(savedCase({ legal_refs: refs }));

    expect(values.legal_refs.map((ref) => ref.links[0]?.pasal)).toEqual(["1", "2", "3"]);
  });
});
