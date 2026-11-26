import { describe, expect, it } from "vitest";

import { reportSession } from "@/test/reportFixtures";
import type { ReportMarkerRead } from "@/types/reports";

import { markerLabel, measurementKindLabel, REPORT_CONTACT_EMAIL, REPORT_LABELS, sessionMarkerList } from "./reportLabels";

// The contract lists four marker codes; a newer server can still send a fifth before the client regenerates.
function unknownMarker(code: string): ReportMarkerRead {
  return { code } as unknown as ReportMarkerRead;
}

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

  // server#145 4e26ece: Uji Coba is no longer a D2 marker code; it comes from the session's is_trial flag.
  it.each([
    ["en", "Trial"],
    ["id", "Uji Coba"],
  ] as const)("has the PDF Uji Coba label in %s", (language, trial) => {
    expect(REPORT_LABELS[language].trial).toBe(trial);
  });

  it.each([
    ["en", "Hidden"],
    ["id", "Disamarkan"],
  ] as const)("has the PDF hidden model version label in %s", (language, hidden) => {
    expect(REPORT_LABELS[language].hidden).toBe(hidden);
  });

  it.each([
    [
      "en",
      {
        model_version_differs: "Different model version",
        repetitions_differ: "Different number of attempts",
        manual_date_span_over_7_days: "Manual answers span more than 7 days",
        refusals: "Refused to answer",
      },
    ],
    [
      "id",
      {
        model_version_differs: "Versi model berbeda",
        repetitions_differ: "Jumlah percobaan berbeda",
        manual_date_span_over_7_days: "Rentang jawaban manual lebih dari 7 hari",
        refusals: "Menolak menjawab",
      },
    ],
  ] as const)("names the four D2 markers like the PDF in %s", (language, markers) => {
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
    ["model_version_differs", "en", "Different model version"],
    ["model_version_differs", "id", "Versi model berbeda"],
    ["repetitions_differ", "id", "Jumlah percobaan berbeda"],
  ] as const)("names the known marker %s in %s", (code, language, shown) => {
    expect(markerLabel({ code }, language)).toBe(shown);
  });

  // A marker the server adds later must not disappear before it gets a label: show its code, like pdf.py does.
  it("shows the raw code of a marker it does not know yet", () => {
    expect(markerLabel(unknownMarker("judge_retried"), "en")).toBe("judge_retried");
  });

  // Negative: a code that happens to name a built-in object property must not print that property.
  it.each(["toString", "constructor", "__proto__", "hasOwnProperty"])(
    "shows the raw code %s instead of an inherited object property",
    (code) => {
      expect(markerLabel(unknownMarker(code), "en")).toBe(code);
    },
  );

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
    expect(markerLabel({ code: "repetitions_differ", detail }, "en")).toBe("Different number of attempts");
  });
});

// The D2 markers of one product for the badges of the Penanda cell (SCRUM-346 N8). Uji Coba comes from is_trial
// and is drawn by the table, first, like pdf.py _penanda_sesi; the table test checks that order.
describe("sessionMarkerList", () => {
  it("lists every marker of a product in the report's language", () => {
    const session = reportSession({ markers: [{ code: "repetitions_differ" }, { code: "refusals", detail: "2" }] });
    expect(sessionMarkerList(session, "en")).toEqual(["Different number of attempts", "Refused to answer (2)"]);
    expect(sessionMarkerList(session, "id")).toEqual(["Jumlah percobaan berbeda", "Menolak menjawab (2)"]);
  });

  it("leaves the trial mark to the table", () => {
    const session = reportSession({ is_trial: true, markers: [{ code: "model_version_differs" }] });
    expect(sessionMarkerList(session, "id")).toEqual(["Versi model berbeda"]);
  });

  // The server no longer sends "trial" as a code; if it ever did, it is just an unknown code, like in pdf.py.
  it("does not read a trial code as the Uji Coba mark", () => {
    expect(sessionMarkerList(reportSession({ markers: [unknownMarker("trial")] }), "id")).toEqual(["trial"]);
  });

  // The field has a server default (empty), so it may be missing.
  it.each([
    ["no markers", reportSession({ markers: [] })],
    ["missing fields", reportSession({ markers: undefined, is_trial: undefined })],
  ])("is empty for a product with %s", (_, session) => {
    expect(sessionMarkerList(session, "id")).toEqual([]);
  });
});
