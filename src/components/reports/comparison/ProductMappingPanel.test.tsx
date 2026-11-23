import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProductLabelMapping } from "@/types/reports";

import { ProductMappingPanel } from "./ProductMappingPanel";

// SCRUM-367 (PBI-15 AC9): on a code-labelled report the server sends Admin the code to real name mapping. The
// panel only draws what it is given; whether to send it is the server's decision, so null means nothing to show.
const mapping: ProductLabelMapping[] = [
  { label: "Product A", real_name: "AiYU" },
  { label: "Product B", real_name: "Gemini" },
];

describe("ProductMappingPanel", () => {
  // Positive: one row per code, code first, real name next to it.
  it("lists every code with its real product name", () => {
    // Arrange + Act
    render(<ProductMappingPanel mapping={mapping} />);

    // Assert
    const table = screen.getByRole("table", { name: "Pemetaan kode produk" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Product A", "AiYU"]);
    expect(within(rows[1]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Product B", "Gemini"]);
  });

  // Positive: tells the Admin who may see this and that it stays out of PDF and publication.
  it("says the panel is for Admin only and is not part of the PDF or the publication", () => {
    // Arrange + Act
    render(<ProductMappingPanel mapping={mapping} />);

    // Assert
    expect(screen.getByRole("heading", { name: "Pemetaan kode produk" })).toBeInTheDocument();
    expect(screen.getByText(/hanya terlihat oleh Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/tidak ikut PDF dan publikasi/i)).toBeInTheDocument();
  });

  // Edge: the product was deleted after the report was made, so the server sends no real name.
  it("shows a plain text when the product no longer exists", () => {
    // Arrange + Act
    render(<ProductMappingPanel mapping={[{ label: "Product A", real_name: null }]} />);

    // Assert
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("Produk tidak tersedia");
  });

  // Negative: every other role gets null from the server (AC9), a real-name report too.
  it("renders nothing when the server sent no mapping", () => {
    // Arrange + Act
    const { container } = render(<ProductMappingPanel mapping={null} />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an empty mapping", () => {
    const { container } = render(<ProductMappingPanel mapping={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the field is absent", () => {
    const { container } = render(<ProductMappingPanel mapping={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  // Edge: names are plain text, so markup in a product name is not run.
  it("prints a product name with markup as text", () => {
    // Arrange + Act
    render(<ProductMappingPanel mapping={[{ label: "Product A", real_name: "<b>Evil</b>" }]} />);

    // Assert
    expect(screen.getByText("<b>Evil</b>")).toBeInTheDocument();
  });
});
