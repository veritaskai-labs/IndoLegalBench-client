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

  // K-05: the case code never differs between versions, so it is not a compare row.
  it("shows every section of the case except the case code, in order", () => {
    // Arrange / Act
    render(<VersionCompareResult result={comparison()} />);

    // Assert
    const labels = screen.getAllByRole("rowheader").map((cell) => cell.textContent?.replace("Berubah", ""));
    expect(labels).toEqual([
      "Judul",
      "Pertanyaan",
      "Kategori",
      "Tag dev/test",
      "Rujukan hukum",
      "Kriteria jawaban",
      "Pengurang Poin",
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

  // K-05: a summary above the table, so many changes can be read without scanning every row.
  it("summarises the changed sections above the table", () => {
    // Arrange
    const result = comparison({ changed: ["traps", "category"] });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("2 bagian berubah: Kategori, Pengurang Poin.");
  });

  // Negative: even if the server reports it, the case code has no row.
  it("never shows a case code row", () => {
    // Arrange
    const result = comparison({ changed: ["case_code"] });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    expect(screen.queryByRole("row", { name: /^ID kasus/ })).not.toBeInTheDocument();
    expect(screen.queryByText("ILB-PT-0142")).not.toBeInTheDocument();
  });

  // K-05: the line that differs inside a changed section gets a text marker, not only colour.
  it("marks the lines that are only in one version inside a changed section", () => {
    // Arrange
    const shared = { kind: "free_text", free_text: "UU No. 13 Tahun 2003, Pasal 151" };
    const added = { kind: "free_text", free_text: "UU No. 6 Tahun 2023, Pasal 81" };
    const result = comparison({
      a: makeSide(1, { sections: makeSections({ legal_refs: [shared] }) }),
      b: makeSide(2, { sections: makeSections({ legal_refs: [shared, added] }) }),
      changed: ["legal_refs"],
    });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    const refs = row("Rujukan hukum");
    const addedLine = within(refs).getByText("UU No. 6 Tahun 2023, Pasal 81").closest("p");
    expect(addedLine).toHaveAttribute("data-mark", "only_b");
    expect(addedLine).toHaveTextContent("Hanya di Versi 2");
    expect(within(refs).getAllByText("UU No. 13 Tahun 2003, Pasal 151")).toHaveLength(2);
    expect(within(refs).queryByText(/Hanya di Versi 1/)).not.toBeInTheDocument();
  });

  it("marks a line that was removed in the other version on the left side", () => {
    // Arrange
    const result = comparison({
      b: makeSide(2, { sections: makeSections({ category: "Perburuhan" }) }),
      changed: ["category"],
    });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    const left = within(row("Kategori")).getByText("Ketenagakerjaan").closest("p");
    expect(left).toHaveAttribute("data-mark", "only_a");
    expect(left).toHaveTextContent("Hanya di Versi 1");
  });

  // Edge: a section the server did not report as changed is shown plainly, without line markers.
  it("does not mark lines in a section the server reports as unchanged", () => {
    // Arrange
    const result = comparison({ changed: [] });

    // Act
    render(<VersionCompareResult result={result} />);

    // Assert
    expect(screen.queryByText(/Hanya di Versi/)).not.toBeInTheDocument();
  });

  // K-05: on a narrow screen the table scrolls sideways inside a named section.
  it("puts the table in a named sideways scroll section", () => {
    // Arrange / Act
    render(<VersionCompareResult result={comparison()} />);

    // Assert
    const area = screen.getByRole("region", { name: "Tabel perbandingan versi, bisa digeser ke samping" });
    expect(area.tagName).toBe("SECTION");
    expect(area).toHaveClass("overflow-x-auto");
    expect(within(area).getByRole("table")).toBeInTheDocument();
  });
});
