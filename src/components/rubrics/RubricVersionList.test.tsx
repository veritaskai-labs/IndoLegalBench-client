import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { makeRubricVersion } from "@/test/rubricFixtures";
import { RubricVersionList } from "./RubricVersionList";

function rowsOf(table: HTMLElement) {
  return within(table).getAllByRole("row").slice(1);
}

function cardsOf() {
  return within(screen.getByRole("list", { name: "Versi rubrik" })).getAllByRole("listitem");
}

/** Versions 1..count, the highest active, as the server keeps exactly one active version. */
function versions(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makeRubricVersion({ id: `v-${index + 1}`, version_no: index + 1, is_active: index + 1 === count }),
  );
}

describe("RubricVersionList (AC7 read-only list, SCRUM-375 A1–A3)", () => {
  // Positive (A2): approver and approval date are two columns, named like the fields of the form.
  it("has a column for every field, with the approver split from the approval date", () => {
    // Act
    render(<RubricVersionList versions={[makeRubricVersion()]} />);

    // Assert
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Versi", "Berlaku sejak", "Dibuat oleh", "Disetujui oleh", "Tanggal persetujuan", "Status"]);
  });

  // Positive: number, dates, creator, approver and status of one version.
  it("shows number, effective date, creator, approver, approval date and status", () => {
    // Act
    render(<RubricVersionList versions={[makeRubricVersion({ effective_date: "2026-11-10" })]} />);

    // Assert
    const [row] = rowsOf(screen.getByRole("table", { name: "Versi rubrik" }));
    const cells = within(row).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["Versi 1", "10 Nov 2026", "Aileen", "Steven & Deanne", "27 Okt 2026", "Aktif"]);
  });

  // Positive (A1): the active version carries a marker, so it stands out from the grey "Tidak aktif" rows.
  it("marks only the active row", () => {
    // Act
    render(<RubricVersionList versions={versions(3)} />);

    // Assert
    const marked = rowsOf(screen.getByRole("table")).map(
      (row) => within(row).getAllByRole("cell")[0].querySelector("[data-active='true']") !== null,
    );
    expect(marked).toEqual([true, false, false]);
  });

  // Edge: the server order is not trusted; edge because the API sorts by number but nothing pins it.
  it("lists the newest version first", () => {
    // Arrange
    const unsorted = [
      makeRubricVersion({ id: "v-1", version_no: 1, is_active: false }),
      makeRubricVersion({ id: "v-3", version_no: 3 }),
      makeRubricVersion({ id: "v-2", version_no: 2, is_active: false }),
    ];

    // Act
    render(<RubricVersionList versions={unsorted} />);

    // Assert
    const titles = rowsOf(screen.getByRole("table")).map((row) => within(row).getAllByRole("cell")[0].textContent);
    expect(titles).toEqual(["Versi 3", "Versi 2", "Versi 1"]);
  });

  // Positive (A1): the footer says how many versions there are, so a cut-off table is never mistaken for the whole list.
  it("names the shown range and the total under the table", () => {
    // Act
    render(<RubricVersionList versions={versions(8)} />);

    // Assert
    expect(screen.getByText("Menampilkan 1–8 dari 8 versi · terbaru di atas")).toBeInTheDocument();
  });

  // Edge: 12 versions need a second page; edge because the table pages at 10, and the baseline cut rows without saying so.
  it("pages after ten versions and updates the footer", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RubricVersionList versions={versions(12)} />);
    expect(rowsOf(screen.getByRole("table"))).toHaveLength(10);

    // Act: the table pager comes first in the page, the phone pager second
    await user.click(screen.getAllByRole("button", { name: "Berikutnya" })[0]);

    // Assert
    expect(rowsOf(screen.getByRole("table"))).toHaveLength(2);
    expect(screen.getByText("Menampilkan 11–12 dari 12 versi · terbaru di atas")).toBeInTheDocument();
  });

  // Positive (A3): on a phone each version is a card, five per page, approver and date on one line.
  it("offers the versions as cards for the phone, five per page", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RubricVersionList versions={versions(8)} />);

    // Assert: first page
    const cards = cardsOf();
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByText("Versi 8")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Aktif")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Steven & Deanne · 27 Okt 2026")).toBeInTheDocument();
    expect(screen.getByText("1–5 dari 8 versi")).toBeInTheDocument();

    // Act: 8 versions fit one table page, so the only pager is the phone one
    await user.click(screen.getByRole("button", { name: "Berikutnya" }));

    // Assert
    expect(cardsOf()).toHaveLength(3);
    expect(screen.getByText("6–8 dari 8 versi")).toBeInTheDocument();
  });

  // Edge: the approver of a new version may still be TBA; edge because the date then has nobody to belong to.
  it("shows dashes for a version without an approver and marks an inactive one", () => {
    // Act
    render(<RubricVersionList versions={[makeRubricVersion({ approved_by_name: null, is_active: false })]} />);

    // Assert
    const [row] = rowsOf(screen.getByRole("table"));
    const cells = within(row).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells.slice(3)).toEqual(["-", "-", "Tidak aktif"]);
  });

  // Negative: the list is read-only, a version is never edited in place (new version instead).
  it("has no buttons or links to change a version", () => {
    // Act
    render(<RubricVersionList versions={versions(2)} />);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Edge (A3): before v1 exists there is nothing to list; the text says what that blocks, so the Admin knows why to start.
  it("shows an empty state that names the consequence when there are no versions", () => {
    // Act
    render(<RubricVersionList versions={[]} />);

    // Assert
    expect(screen.getAllByText("Belum ada versi rubrik").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sesi belum bisa dinilai sebelum ada versi aktif.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Menampilkan/)).not.toBeInTheDocument();
  });
});
