import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_COLUMNS } from "./importGuide";

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
