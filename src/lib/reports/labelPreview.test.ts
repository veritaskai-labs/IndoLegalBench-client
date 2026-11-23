import { describe, expect, it } from "vitest";

import { codeLabel, LABEL_MODE_TEXT, previewLabels } from "./labelPreview";

// SCRUM-367 (PBI-15 AC9): before a report is made, Admin sees what each product will be called. The server
// numbers products by their order in the request (product_labels.py), so the preview follows the picked order.
describe("previewLabels", () => {
  // Positive: real names are kept exactly as written.
  it("keeps the real names in real_name mode", () => {
    // Arrange
    const names = ["AiYU", "Gemini"];

    // Act
    const rows = previewLabels("real_name", names);

    // Assert
    expect(rows).toEqual([
      { productName: "AiYU", label: "AiYU" },
      { productName: "Gemini", label: "Gemini" },
    ]);
  });

  // Positive: codes follow the picked order, starting at Product A.
  it("numbers the products Product A, Product B in code mode", () => {
    // Arrange
    const names = ["Justisio", "AiYU", "Gemini"];

    // Act
    const rows = previewLabels("code", names);

    // Assert
    expect(rows.map((row) => row.label)).toEqual(["Product A", "Product B", "Product C"]);
    expect(rows.map((row) => row.productName)).toEqual(names);
  });

  // Edge: nothing picked yet, so there is nothing to preview.
  it.each(["real_name", "code"] as const)("returns no rows in %s mode when no product is picked", (mode) => {
    // Act
    const rows = previewLabels(mode, []);

    // Assert
    expect(rows).toEqual([]);
  });

  // Edge: there is no limit on products (AC1), so letters continue after Z like spreadsheet columns.
  it("continues after Product Z with Product AA", () => {
    // Arrange
    const names = Array.from({ length: 28 }, (_, index) => `P${index}`);

    // Act
    const labels = previewLabels("code", names).map((row) => row.label);

    // Assert
    expect(labels[25]).toBe("Product Z");
    expect(labels[26]).toBe("Product AA");
    expect(labels[27]).toBe("Product AB");
  });
});

describe("codeLabel", () => {
  it.each([
    [0, "Product A"],
    [25, "Product Z"],
    [26, "Product AA"],
    [51, "Product AZ"],
    [52, "Product BA"],
  ])("turns position %i into %s", (index, expected) => {
    expect(codeLabel(index)).toBe(expected);
  });

  // Negative: a negative position is a bug in the caller, as on the server.
  it("rejects a negative position", () => {
    expect(() => codeLabel(-1)).toThrow(RangeError);
  });
});

describe("LABEL_MODE_TEXT", () => {
  // Positive: the option names and help text explain what happens in the report (SCRUM-367).
  it("names both options and explains each in plain words", () => {
    expect(LABEL_MODE_TEXT.real_name.label).toBe("Nama asli");
    expect(LABEL_MODE_TEXT.real_name.help).toMatch(/nama produk.*sesuai.*aslinya/i);
    expect(LABEL_MODE_TEXT.code.label).toBe("Kode (anonim)");
    expect(LABEL_MODE_TEXT.code.help).toMatch(/Product A/);
    expect(LABEL_MODE_TEXT.code.help).toMatch(/hanya Admin/i);
  });
});
