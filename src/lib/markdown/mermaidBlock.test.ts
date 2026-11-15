/**
 * Tes mermaidSource: memilih blok kode mana yang digambar sebagai diagram (PBI-22, K-12, SCRUM-295).
 * Aturannya dari temuan UAT K-12: hanya blok berpagar ```mermaid yang jadi diagram, blok kode lain
 * tetap tampil sebagai teks.
 * Label tes: Positif = blok Mermaid dikenali, Negatif = bukan Mermaid, Edge = bentuk simpul tak biasa.
 */
import type { ExtraProps } from "react-markdown";
import { describe, expect, it } from "vitest";

import { mermaidSource } from "./mermaidBlock";

type PreNode = NonNullable<ExtraProps["node"]>;
type Child = PreNode["children"][number];

/** Simpul `pre` seperti buatan react-markdown, supaya tes tidak perlu memparse markdown. */
function pre(children: Child[]): PreNode {
  return { type: "element", tagName: "pre", properties: {}, children };
}

function code(className: unknown, children: Child[]): Child {
  const properties = className === undefined ? {} : { className: className as string[] };
  return { type: "element", tagName: "code", properties, children };
}

function text(value: string): Child {
  return { type: "text", value };
}

describe("mermaidSource (K-12, SCRUM-295)", () => {
  // Positif: blok ```mermaid dikembalikan persis seperti yang ditulis, termasuk baris barunya.
  it("returns the code of a mermaid block unchanged", () => {
    // Arrange
    const node = pre([code(["language-mermaid"], [text("graph TD\n  A --> B\n")])]);

    // Act
    const source = mermaidSource(node);

    // Assert
    expect(source).toBe("graph TD\n  A --> B\n");
  });

  // Negatif: blok bahasa lain (sql, python) harus tetap jadi teks kode, bukan diagram.
  it.each([["language-sql"], ["language-python"], ["language-mermaidx"]])(
    "returns null for a %s block",
    (className) => {
      // Arrange
      const node = pre([code([className], [text("SELECT 1;\n")])]);

      // Act
      const source = mermaidSource(node);

      // Assert
      expect(source).toBeNull();
    },
  );

  // Negatif: blok berpagar tanpa nama bahasa tidak punya kelas sama sekali.
  it("returns null for a fenced block without a language", () => {
    // Arrange
    const node = pre([code(undefined, [text("graph TD\n")])]);

    // Act
    const source = mermaidSource(node);

    // Assert
    expect(source).toBeNull();
  });

  // Edge: komponen `pre` bisa dipanggil tanpa simpul; itu bukan diagram dan tidak boleh melempar galat.
  it("returns null when there is no node", () => {
    // Act
    const source = mermaidSource(undefined);

    // Assert
    expect(source).toBeNull();
  });

  // Edge: `pre` yang isinya bukan elemen `code` (teks langsung atau elemen lain) bukan blok Mermaid.
  it.each<[string, Child[]]>([
    ["no children", []],
    ["a text child", [text("graph TD")]],
    ["a non-code element", [{ type: "element", tagName: "span", properties: { className: ["language-mermaid"] }, children: [] }]],
  ])("returns null for a pre with %s", (_label, children) => {
    // Arrange
    const node = pre(children);

    // Act
    const source = mermaidSource(node);

    // Assert
    expect(source).toBeNull();
  });

  // Edge: kelas yang bukan daftar (bentuk tak terduga dari plugin lain) dianggap bukan Mermaid.
  it("returns null when the class name is not a list", () => {
    // Arrange
    const node = pre([code("language-mermaid", [text("graph TD")])]);

    // Act
    const source = mermaidSource(node);

    // Assert
    expect(source).toBeNull();
  });

  // Edge: blok ```mermaid yang kosong tetap blok Mermaid; isinya string kosong, bukan null.
  it("returns an empty string for an empty mermaid block", () => {
    // Arrange
    const node = pre([code(["language-mermaid"], [])]);

    // Act
    const source = mermaidSource(node);

    // Assert
    expect(source).toBe("");
  });

  // Edge: hanya simpul teks yang dihitung sebagai kode; simpul lain di dalamnya dilewati.
  it("joins text children and skips non-text children", () => {
    // Arrange
    const node = pre([
      code(["language-mermaid"], [text("graph TD\n"), { type: "comment", value: "x" }, text("  A --> B\n")]),
    ]);

    // Act
    const source = mermaidSource(node);

    // Assert
    expect(source).toBe("graph TD\n  A --> B\n");
  });
});
