import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_COLUMNS, JSON_FORMAT_REASON, jsonListColumns } from "./importGuide";

/**
 * Contract guard (E69: a copied value is tested against its source). The column names in the guide are a
 * copy of the server template; the only place the contract states them is the description of the 200
 * response of GET /case-imports/template. Reading contract/openapi.json makes this test fail as soon as a
 * regenerated contract renames, adds, or reorders a column.
 */
function templateColumnsFromContract(): string[] {
  // Vitest runs from the project root (jsdom gives import.meta.url a non-file scheme).
  const path = resolve(process.cwd(), "contract/openapi.json");
  const contract = JSON.parse(readFileSync(path, "utf-8"));
  const description: string = contract.paths["/case-imports/template"].get.responses["200"].description;
  const match = /kolom \(([^)]+)\)/.exec(description);
  if (match === null) throw new Error(`No column list in the template description: ${description}`);
  return match[1].split(",").map((name) => name.trim());
}

describe("GUIDE_COLUMNS", () => {
  // Positive: same names, same order as the template the server sends.
  it("lists exactly the template columns of the contract, in order", () => {
    // Arrange
    const expected = templateColumnsFromContract();

    // Act
    const names = GUIDE_COLUMNS.map((column) => column.name);

    // Assert
    expect(expected.length).toBeGreaterThan(0);
    expect(names).toEqual(expected);
  });

  // Positive: case_code is made by the system (AC8), so it never appears in the guide.
  it("does not ask for a case code", () => {
    // Arrange / Act
    const names = GUIDE_COLUMNS.map((column) => column.name);

    // Assert
    expect(names).not.toContain("case_code");
  });

  // Positive: the three list columns of the server (legal_refs, must_contain, must_not_contain) are JSON lists.
  it("marks the list columns named in the contract as JSON lists", () => {
    // Arrange
    const lists = GUIDE_COLUMNS.filter((column) => column.jsonList).map((column) => column.name);

    // Act / Assert
    expect(lists).toEqual(["legal_refs", "must_contain", "must_not_contain"]);
  });

  // Negative: an example a user copies into a cell must be accepted by the server's JSON parser.
  it.each(GUIDE_COLUMNS.filter((column) => column.jsonList))(
    "gives $name an example that parses as a JSON list of texts",
    (column) => {
      // Arrange / Act
      const parsed: unknown = JSON.parse(column.example);

      // Assert
      expect(Array.isArray(parsed)).toBe(true);
      expect((parsed as unknown[]).length).toBeGreaterThan(0);
      expect((parsed as unknown[]).every((item) => typeof item === "string")).toBe(true);
    },
  );

  // Edge: L1, students never write case content, so every example is an obvious placeholder.
  it.each(GUIDE_COLUMNS.filter((column) => column.example !== ""))(
    "uses a placeholder for the $name example",
    (column) => {
      // Arrange / Act / Assert
      expect(column.example).toMatch(/contoh|frasa/i);
    },
  );

  // Edge: split_tag is decided after import (client 4.3), so its example is the empty cell.
  it("shows split_tag as optional and names its allowed values", () => {
    // Arrange
    const splitTag = GUIDE_COLUMNS.find((column) => column.name === "split_tag");

    // Act / Assert
    expect(splitTag?.example).toBe("");
    expect(splitTag?.meaning).toContain("dev");
    expect(splitTag?.meaning).toContain("test");
    expect(splitTag?.meaning).toContain("kosong");
  });
});

describe("jsonListColumns (SCRUM-380, field berformat list JSON)", () => {
  // Positive: the highlighted fields are exactly the list columns the server parses as JSON, in template order.
  it("returns the three list columns in template order", () => {
    // Arrange / Act
    const names = jsonListColumns().map((column) => column.name);

    // Assert
    expect(names).toEqual(["legal_refs", "must_contain", "must_not_contain"]);
  });

  // Negative: plain text columns and the optional tag are never highlighted as JSON.
  it("leaves out the plain text columns", () => {
    // Arrange / Act
    const names = jsonListColumns().map((column) => column.name);

    // Assert
    expect(names).not.toContain("title");
    expect(names).not.toContain("split_tag");
    expect(names).not.toContain("expected_conclusion");
  });

  // Edge: every highlighted field carries an example that can be copied, so the copy button is never empty.
  it("gives every JSON column a non-empty example", () => {
    // Arrange / Act
    const columns = jsonListColumns();

    // Assert
    expect(columns.length).toBeGreaterThan(0);
    expect(columns.every((column) => column.example.trim() !== "")).toBe(true);
  });
});

describe("JSON_FORMAT_REASON (SCRUM-380)", () => {
  // Positive: the reason says the field is read as a JSON list and what happens to an invalid row.
  it("explains that invalid JSON fails the row and is reported in the result summary", () => {
    // Arrange / Act
    const reason = JSON_FORMAT_REASON;

    // Assert
    expect(reason).toContain("list JSON");
    expect(reason).toMatch(/gagal diimpor/);
    expect(reason).toMatch(/ringkasan hasil/);
  });
});
