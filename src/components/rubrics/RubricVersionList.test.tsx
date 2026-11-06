import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeRubricVersion } from "@/test/rubricFixtures";
import { RubricVersionList } from "./RubricVersionList";

function rowsOf(table: HTMLElement) {
  return within(table).getAllByRole("row").slice(1);
}

describe("RubricVersionList (AC7: daftar versi read-only)", () => {
  // Positive: number, date, creator, approver and status, as the sub task asks.
  it("shows number, effective date, creator, approver and status of a version", () => {
    // Arrange
    const versions = [makeRubricVersion()];

    // Act
    render(<RubricVersionList versions={versions} />);

    // Assert
    const [row] = rowsOf(screen.getByRole("table", { name: "Versi rubrik" }));
    expect(within(row).getByRole("cell", { name: "Versi 1" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "27 Okt 2026" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "Aileen" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "Steven & Deanne, 27 Okt 2026" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "Aktif" })).toBeInTheDocument();
  });

  it("has a column header for every column", () => {
    // Arrange
    const versions = [makeRubricVersion()];

    // Act
    render(<RubricVersionList versions={versions} />);

    // Assert
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Versi", "Berlaku sejak", "Dibuat oleh", "Penyetuju", "Status"]);
  });

  // Edge: the newest version is on top whatever order the server sent.
  it("lists the newest version first", () => {
    // Arrange
    const versions = [
      makeRubricVersion({ id: "v-1", version_no: 1, is_active: false }),
      makeRubricVersion({ id: "v-3", version_no: 3 }),
      makeRubricVersion({ id: "v-2", version_no: 2, is_active: false }),
    ];

    // Act
    render(<RubricVersionList versions={versions} />);

    // Assert
    const titles = rowsOf(screen.getByRole("table")).map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(titles).toEqual(["Versi 3", "Versi 2", "Versi 1"]);
  });

  // Edge: the approver of a new version is still TBA from the client, so the cell may be empty.
  it("shows a dash for a version without an approver and marks an inactive one", () => {
    // Arrange
    const versions = [makeRubricVersion({ approved_by_name: null, approved_at: null, is_active: false })];

    // Act
    render(<RubricVersionList versions={versions} />);

    // Assert
    const [row] = rowsOf(screen.getByRole("table"));
    expect(within(row).getByRole("cell", { name: /^-$/ })).toBeInTheDocument();
    expect(within(row).getByText("Tidak aktif")).toBeInTheDocument();
  });

  // Negative: the list is read-only, a version is never edited in place (new version instead).
  it("has no buttons or links to change a version", () => {
    // Arrange
    const versions = [makeRubricVersion(), makeRubricVersion({ id: "v-2", version_no: 2 })];

    // Act
    render(<RubricVersionList versions={versions} />);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Edge: before v1 is typed in there is nothing to list, and the page says how to start.
  it("shows an empty state when there are no versions", () => {
    // Arrange
    const versions: [] = [];

    // Act
    render(<RubricVersionList versions={versions} />);

    // Assert
    expect(screen.getByText("Belum ada versi rubrik")).toBeInTheDocument();
    expect(screen.getByText("Buat versi pertama lewat form di bawah, atau mulai dari template rubrik v1.")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryAllByRole("row")).toHaveLength(2);
  });
});
