import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductLabelPreview } from "./ProductLabelPreview";

// SCRUM-367 (PBI-15 AC9): Admin sees how each picked product will be named before the report is made.
describe("ProductLabelPreview", () => {
  // Positive: real names map to themselves.
  it("shows each picked product under its real name", () => {
    // Arrange + Act
    render(<ProductLabelPreview mode="real_name" productNames={["AiYU", "Gemini"]} />);

    // Assert
    const items = within(screen.getByRole("list", { name: "Pratinjau label produk" })).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["AiYU → AiYU", "Gemini → Gemini"]);
  });

  // Positive: code mode hides the name behind Product A, B in picked order.
  it("shows each picked product under its code in code mode", () => {
    // Arrange + Act
    render(<ProductLabelPreview mode="code" productNames={["Justisio", "AiYU"]} />);

    // Assert
    const items = within(screen.getByRole("list", { name: "Pratinjau label produk" })).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Justisio → Product A", "AiYU → Product B"]);
  });

  // Edge: nothing picked yet.
  it("asks the user to pick sessions when none is picked", () => {
    // Arrange + Act
    render(<ProductLabelPreview mode="code" productNames={[]} />);

    // Assert
    expect(screen.getByText("Pilih sesi untuk melihat pratinjau label.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  // Edge: the preview tells the user the saved report is what counts.
  it("notes that the saved report is the final word", () => {
    render(<ProductLabelPreview mode="code" productNames={["AiYU"]} />);

    expect(screen.getByText(/urutan pilihan sesi/i)).toBeInTheDocument();
  });
});
