import { describe, expect, it } from "vitest";

import { markerLabel, markersText, measurementKindLabel, REPORT_CONTACT_EMAIL, REPORT_LABELS } from "./reportLabels";

// SCRUM-322 (Fase 0 K3): the report body speaks the report's language, with the exact words of the server PDF
// (PR #145, app/modules/reports/pdf.py _LABELS), so a reader sees the same text on the web and in the PDF.
// These tables are copied from pdf.py on purpose: if one side changes, this test is where the drift shows.
describe("REPORT_LABELS parity with the server PDF", () => {
  it("has the eleven table columns of the PDF in English", () => {
    expect(REPORT_LABELS.en.columns).toEqual([
      "Rank",
      "Product",
      "Type",
      "Deterministic score",
      "LLM judge score",
      "Cases graded",
      "Basis cases",
      "Failure rate",
      "Attempts",
      "Model version",
      "Markers",
    ]);
  });

  it("has the eleven table columns of the PDF in Indonesian", () => {
    expect(REPORT_LABELS.id.columns).toEqual([
      "Peringkat",
      "Produk",
      "Jenis",
      "Skor deterministik",
      "Skor penilai LLM",
      "Kasus dinilai",
      "Kasus dasar",
      "Tingkat kegagalan",
      "Percobaan",
      "Versi model",
      "Penanda",
    ]);
  });

  it.each([
    ["en", { test: "Test cases", dev: "Dev cases", combined: "Dev + test combined" }],
    ["id", { test: "Kasus test", dev: "Kasus dev", combined: "Gabungan dev + test" }],
  ] as const)("names the score splits like the PDF in %s", (language, splits) => {
    expect(REPORT_LABELS[language].splits).toEqual(splits);
  });

  it.each([
    [
      "en",
      {
        trial: "Trial",
        model_version_differs: "Different model version",
        repetitions_differ: "Different number of attempts",
        manual_date_span_over_7_days: "Manual answers span more than 7 days",
        refusals: "Refused to answer",
      },
    ],
    [
      "id",
      {
        trial: "Uji Coba",
        model_version_differs: "Versi model berbeda",
        repetitions_differ: "Jumlah percobaan berbeda",
        manual_date_span_over_7_days: "Rentang jawaban manual lebih dari 7 hari",
        refusals: "Menolak menjawab",
      },
    ],
  ] as const)("names the five D2 markers like the PDF in %s", (language, markers) => {
    expect(REPORT_LABELS[language].markers).toEqual(markers);
  });

  it.each([
    ["en", "This report contains dev scores. Internal only, it cannot be published.", "Not applicable"],
    ["id", "Laporan berisi skor dev, hanya untuk internal dan tidak dapat diterbitkan.", "Tidak berlaku"],
  ] as const)("uses the PDF dev banner and 'not applicable' text in %s", (language, devBanner, notApplicable) => {
    expect(REPORT_LABELS[language].devBanner).toBe(devBanner);
    expect(REPORT_LABELS[language].notApplicable).toBe(notApplicable);
  });

  it.each(["en", "id"] as const)("points readers to the Veritask email for case contents in %s", (language) => {
    expect(REPORT_CONTACT_EMAIL).toBe("indolegalbench@veritask.ai");
    expect(REPORT_LABELS[language].contact).toContain(REPORT_CONTACT_EMAIL);
  });

  it.each([
    ["en", "January", "December"],
    ["id", "Januari", "Desember"],
  ] as const)("has twelve full month names in %s", (language, first, last) => {
    const { months } = REPORT_LABELS[language];
    expect(months).toHaveLength(12);
    expect(months[0]).toBe(first);
    expect(months[11]).toBe(last);
  });
});

describe("measurementKindLabel (PBI-15 AC5)", () => {
  it.each([
    ["automatic", "en", "Automatic"],
    ["manual", "en", "Manual"],
    ["automatic", "id", "Otomatis"],
    ["manual", "id", "Manual"],
  ] as const)("labels %s in %s as %s", (kind, language, shown) => {
    expect(measurementKindLabel(kind, language)).toBe(shown);
  });
});

describe("markerLabel", () => {
  it.each([
    ["trial", "en", "Trial"],
    ["trial", "id", "Uji Coba"],
    ["repetitions_differ", "id", "Jumlah percobaan berbeda"],
  ] as const)("names the known marker %s in %s", (code, language, shown) => {
    expect(markerLabel({ code }, language)).toBe(shown);
  });

  // A marker the server adds later must not disappear before it gets a label: show its code, like pdf.py does.
  it("shows the raw code of a marker it does not know yet", () => {
    expect(markerLabel({ code: "judge_retried" }, "en")).toBe("judge_retried");
  });

  it.each([
    ["en", "Refused to answer (2)"],
    ["id", "Menolak menjawab (2)"],
  ] as const)("adds the detail in brackets in %s", (language, shown) => {
    expect(markerLabel({ code: "refusals", detail: "2" }, language)).toBe(shown);
  });

  // Boundary: pdf.py adds brackets when the detail is truthy. "0" is non-empty text, so it still counts.
  it("keeps a detail of 0", () => {
    expect(markerLabel({ code: "refusals", detail: "0" }, "en")).toBe("Refused to answer (0)");
  });

  it.each([null, undefined, ""])("adds no brackets for the empty detail %j", (detail) => {
    expect(markerLabel({ code: "trial", detail }, "en")).toBe("Trial");
  });
});

describe("markersText", () => {
  it("joins every marker of a product with a semicolon, like the PDF cell", () => {
    expect(markersText([{ code: "repetitions_differ" }, { code: "refusals", detail: "2" }], "en")).toBe(
      "Different number of attempts; Refused to answer (2)",
    );
  });

  it("is empty for a product with no markers", () => {
    expect(markersText([], "id")).toBe("");
  });
});
