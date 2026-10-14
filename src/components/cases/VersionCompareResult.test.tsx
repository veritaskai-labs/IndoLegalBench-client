import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeCompare, makeSections, makeSide } from "@/test/versionFixtures";
import type { VersionCompare } from "@/types/caseVersion";
import { VersionCompareResult } from "./VersionCompareResult";

/** Version 1 against a draft version 2 by someone else, where only the category differs. */
function comparison(overrides: Partial<VersionCompare> = {}): VersionCompare {
  return makeCompare({
    b: makeSide(2, {
      status: "draft",
      author: { id: "u2", name: "Adra" },
      created_at: "2026-10-04T08:30:00Z",
      sections: makeSections({ category: "Perburuhan" }),
    }),
    changed: ["category"],
    ...overrides,
  });
}

const row = (label: string) => screen.getByRole("row", { name: new RegExp(`^${label}`) });

describe("VersionCompareResult", () => {
  // Positive: AC4, two versions side by side.
  it("shows both versions in one row per section, with who and when", () => {
    // Arrange / Act
    render(<VersionCompareResult result={comparison()} />);

    // Assert
    const headings = screen.getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headings[1]).toContain("Versi 1");
    expect(headings[1]).toContain("Aileen");
    expect(headings[1]).toContain("03 Okt 2026, 14.05 WIB");
    expect(headings[2]).toContain("Versi 2");
    expect(headings[2]).toContain("Adra");
    expect(within(row("Kategori")).getByText("Ketenagakerjaan")).toBeInTheDocument();
    expect(within(row("Kategori")).getByText("Perburuhan")).toBeInTheDocument();
  });

  it("highlights only the sections that changed, with a text marker as well as colour", () => {
    // Arrange / Act
    render(<VersionCompareResult result={comparison()} />);

    // Assert
    expect(row("Kategori")).toHaveAttribute("data-changed", "true");
    expect(within(row("Kategori")).getByText("Berubah")).toBeInTheDocument();
    expect(row("Judul")).toHaveAttribute("data-changed", "false");
    expect(within(row("Judul")).queryByText("Berubah")).not.toBeInTheDocument();
    expect(screen.getAllByText("Berubah")).toHaveLength(1);
  });

  it("shows every section of the case, in order", () => {
    // Arrange / Act
    render(<VersionCompareResult result={comparison()} />);

    // Assert
    const labels = screen.getAllByRole("rowheader").map((cell) => cell.textContent?.replace("Berubah", ""));
    expect(labels).toEqual([
      "Judul",
      "Pertanyaan",
      "Kategori",
      "ID kasus",
      "Tag dev/test",
      "Rujukan hukum",
      "Kriteria jawaban",
      "Jebakan",
    ]);
  });

  it("highlights several changed sections at once", () => {
    // Arrange
    const result = comparison({ changed: ["category", "legal_refs"] });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    expect(screen.getAllByText("Berubah")).toHaveLength(2);
    expect(row("Rujukan hukum")).toHaveAttribute("data-changed", "true");
  });

  it("writes the content of structured sections as readable lines", () => {
    // Arrange
    const result = comparison({
      b: makeSide(2, {
        sections: makeSections({
          legal_refs: [{ regulation_type: "UU", regulation_number: "13", year: 2003, pasal: "151" }],
        }),
      }),
      changed: ["legal_refs"],
    });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    expect(within(row("Rujukan hukum")).getByText("UU No. 13 Tahun 2003, Pasal 151")).toBeInTheDocument();
  });

  // Edge: a section that is empty on one side.
  it("shows a dash for a section that has no content in a version", () => {
    // Arrange
    const result = comparison({
      b: makeSide(2, { sections: makeSections({ category: null }) }),
    });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    expect(within(row("Kategori")).getByText("—")).toBeInTheDocument();
    expect(within(row("Kategori")).getByText("Ketenagakerjaan")).toBeInTheDocument();
  });

  // Edge: same version on both sides, or two identical versions.
  it("says nothing changed when no section differs", () => {
    // Arrange
    const result = comparison({ changed: [] });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tidak ada bagian yang berubah di antara kedua versi.",
    );
    expect(screen.queryByText("Berubah")).not.toBeInTheDocument();
  });

  it("does not show the nothing-changed note when something changed", () => {
    // Arrange / Act
    render(<VersionCompareResult result={comparison()} />);

    // Assert
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
