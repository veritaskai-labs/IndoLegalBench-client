import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GUIDE_COLUMNS } from "@/lib/cases/importGuide";
import { ImportGuide } from "./ImportGuide";

describe("ImportGuide (AC5)", () => {
  // Positive: the guide is open by default so a first-time importer reads it.
  it("starts open under a heading the user can collapse", () => {
    // Arrange / Act
    const { container } = render(<ImportGuide />);

    // Assert
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).toHaveAttribute("open");
    expect(within(details as HTMLElement).getByText("Panduan menyiapkan CSV di Google Sheets")).toBeInTheDocument();
  });

  // Positive: the Google Sheets points of AC5 (encoding, separator, JSON lists, export path).
  it.each([
    "File > Impor > Unggah",
    "File > Download > Comma Separated Values (.csv)",
    "UTF-8",
    "pemisah koma",
    "CSV UTF-8",
    "Jangan mengubah baris pertama",
    "maksimal 500 baris",
    "boleh dikosongkan",
    "Kode kasus tidak perlu diisi",
    "dilewati",
  ])("mentions %s", (phrase) => {
    // Arrange / Act
    render(<ImportGuide />);

    // Assert
    expect(screen.getByText((_, element) => element?.tagName === "LI" && element.textContent?.includes(phrase) === true)).toBeInTheDocument();
  });

  // Positive: one table row per template column, with its name, meaning and example.
  it("shows every template column with its meaning and example", () => {
    // Arrange / Act
    render(<ImportGuide />);

    // Assert
    const table = screen.getByRole("table", { name: "Kolom template CSV" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(GUIDE_COLUMNS.length);
    GUIDE_COLUMNS.forEach((column, index) => {
      const cells = within(rows[index]).getAllByRole("cell");
      expect(cells[0]).toHaveTextContent(column.name);
      expect(cells[1]).toHaveTextContent(column.meaning);
      expect(cells[2].textContent).toBe(column.example === "" ? "(kosong)" : column.example);
    });
  });

  // Edge: a long JSON example must not widen the page on a phone.
  it("lets the column table scroll sideways on a narrow screen", () => {
    // Arrange / Act
    render(<ImportGuide />);

    // Assert
    expect(screen.getByRole("table", { name: "Kolom template CSV" }).parentElement).toHaveClass("overflow-x-auto");
  });
});
