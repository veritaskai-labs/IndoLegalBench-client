import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";

import {
  pdfErrorMessage,
  productColumn,
  REPORT_STATUS_LABEL,
  reportErrorMessage,
  reportListErrorMessage,
  reportPdfFileName,
  SCORE_SCOPE_LABEL,
  supportsInlinePdf,
} from "./reportRules";

// SCRUM-322: the app around the report (status chips, the saved-report list, error messages) stays Indonesian
// until PBI-26 (Fase 0 K3). Only the report body follows the report language.
describe("app labels around the report", () => {
  it.each([
    ["saved", "Tersimpan"],
    ["published", "Terbit"],
    ["superseded", "Digantikan"],
  ] as const)("labels the %s status as %s", (status, shown) => {
    expect(REPORT_STATUS_LABEL[status]).toBe(shown);
  });

  it.each([
    ["test", "Test"],
    ["dev", "Dev"],
    ["dev_test", "Dev + Test"],
  ] as const)("labels the %s score scope as %s", (scope, shown) => {
    expect(SCORE_SCOPE_LABEL[scope]).toBe(shown);
  });
});

describe("reportErrorMessage", () => {
  // D9: only the creator and Admin open a saved report. The server may answer 403 or 404 for someone else's
  // report; both read the same, so the page never confirms that a hidden report exists.
  it.each([403, 404])("explains a %s without saying whether the report exists", (status) => {
    expect(reportErrorMessage(new ApiError(status, "ANY"))).toBe(
      "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.",
    );
  });

  // Negative: the id comes from the URL; the server answers 422 for one that is not a uuid, and a retry never helps.
  it("explains a mistyped report address (422) as not found", () => {
    expect(reportErrorMessage(new ApiError(422, "ANY"))).toBe(
      "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.",
    );
  });

  // Boundary: 402, 405, 421 and 423 sit next to the not-found codes and must not be read as "not found".
  it.each([400, 402, 405, 421, 423, 500])("falls back to a retry message for %s", (status) => {
    expect(reportErrorMessage(new ApiError(status, "ANY"))).toBe("Gagal memuat laporan. Coba lagi.");
  });

  it("falls back to a retry message for a network error", () => {
    expect(reportErrorMessage(new TypeError("Failed to fetch"))).toBe("Gagal memuat laporan. Coba lagi.");
  });
});

describe("reportListErrorMessage and pdfErrorMessage", () => {
  // D9: every role may read the list, so any failure is worth a retry.
  it("asks to retry when the saved-report list fails", () => {
    expect(reportListErrorMessage()).toBe("Gagal memuat daftar laporan. Coba lagi.");
  });

  it.each([403, 404])("explains a %s on the PDF like on the report", (status) => {
    expect(pdfErrorMessage(new ApiError(status, "ANY"))).toBe(
      "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.",
    );
  });

  it("asks to retry when the PDF fails for another reason", () => {
    expect(pdfErrorMessage(new ApiError(500, "ANY"))).toBe("PDF gagal dimuat. Coba lagi.");
  });
});

describe("supportsInlinePdf (Fase 0 K5)", () => {
  it("allows the in-page preview when the browser says it can show PDFs", () => {
    expect(supportsInlinePdf({ pdfViewerEnabled: true })).toBe(true);
  });

  // Most phones report false. Older browsers do not have the property at all: treat that as "cannot" too,
  // because an iframe there often shows only the first page or downloads the file instead.
  it.each([
    ["false", { pdfViewerEnabled: false }],
    ["a missing property", {}],
    ["no navigator", undefined],
  ])("offers only the download for %s", (_, nav) => {
    expect(supportsInlinePdf(nav)).toBe(false);
  });
});

describe("reportPdfFileName", () => {
  // Same name as the server's Content-Disposition (pdf.py report_pdf_filename): the id, never the typed title.
  it("names the file after the report id", () => {
    expect(reportPdfFileName("8f1c2d3e-0000-4000-8000-000000000001")).toBe(
      "laporan-8f1c2d3e-0000-4000-8000-000000000001.pdf",
    );
  });

  // Negative: the id comes from the URL, so anything that could act as a path is replaced.
  it.each([
    ["../../etc", "laporan-------etc.pdf"],
    ["a/b\\c", "laporan-a-b-c.pdf"],
  ])("keeps the unsafe id %j out of the file name", (id, name) => {
    expect(reportPdfFileName(id)).toBe(name);
  });
});

// SCRUM-364 (PBI-15 AC9): the saved-report list shows which products were compared. A long list is cut to
// "A, B +2" so the column stays narrow, and the full list stays available as a tooltip. The labels are frozen
// by the server (real name or code); the screen never reorders or renames them.
describe("productColumn", () => {
  // Positive: up to three products fit, so nothing is hidden; "A, B +1" would hide a name to save nothing.
  it.each([
    [["AiYU"], "AiYU"],
    [["Product A", "Product B"], "Product A, Product B"],
    [["A", "B", "C"], "A, B, C"],
  ])("shows %j in full", (labels, shown) => {
    expect(productColumn(labels)).toEqual({ shown, hiddenCount: 0, full: shown });
  });

  // Positive: from four products on, the first two are shown and the rest is counted.
  it("cuts a long list to the first two and counts the rest", () => {
    expect(productColumn(["A", "B", "C", "D"])).toEqual({ shown: "A, B", hiddenCount: 2, full: "A, B, C, D" });
  });

  // Edge: a report whose sessions were all removed has no labels; say so instead of an empty cell.
  it("says when a report has no products", () => {
    expect(productColumn([])).toEqual({ shown: "Tidak ada produk", hiddenCount: 0, full: "Tidak ada produk" });
  });
});
