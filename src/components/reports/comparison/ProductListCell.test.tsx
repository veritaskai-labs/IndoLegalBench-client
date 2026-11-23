import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProductListCell } from "./ProductListCell";

// SCRUM-364 (PBI-15 AC9): the Produk column of the saved-report list. A long list is cut to "A, B +2" and the
// full list is a tooltip. The tooltip must also reach keyboard and screen reader users, not only a mouse hover
// (WCAG 1.4.13), so the "+2" is a focusable button described by the full list.
// Label: Positif = normal path, Negatif = must not happen, Edge = boundary data.
describe("ProductListCell", () => {
  it("Positif: writes a short list in full, with no tooltip", () => {
    render(<ProductListCell labels={["AiYU", "DeepSeek", "Gemini"]} />);

    expect(screen.getByText("AiYU, DeepSeek, Gemini")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("Positif: cuts a long list to two names and a +N button described by the full list", () => {
    render(<ProductListCell labels={["Product A", "Product B", "Product C", "Product D"]} />);

    expect(screen.getByText("Product A, Product B")).toBeInTheDocument();
    const more = screen.getByRole("button", { name: "+2 produk lain" });
    expect(more).toHaveAccessibleDescription("Product A, Product B, Product C, Product D");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Product A, Product B, Product C, Product D");
  });

  // Keyboard users reach the tooltip with Tab, and the button never submits or navigates anything.
  it("Positif: the +N button takes keyboard focus and does nothing when pressed", async () => {
    const user = userEvent.setup();
    render(<ProductListCell labels={["A", "B", "C", "D", "E"]} />);

    await user.tab();
    const more = screen.getByRole("button", { name: "+3 produk lain" });
    expect(more).toHaveFocus();
    expect(more).toHaveAttribute("type", "button");
    await user.keyboard("{Enter}");
    expect(screen.getByText("A, B")).toBeInTheDocument();
  });

  // Two cut cells in one table must each point at their own tooltip.
  it("Edge: two cells in one table describe each button with its own list", () => {
    render(
      <>
        <ProductListCell labels={["A", "B", "C", "D"]} />
        <ProductListCell labels={["W", "X", "Y", "Z"]} />
      </>,
    );

    const [first, second] = screen.getAllByRole("button");
    expect(first).toHaveAccessibleDescription("A, B, C, D");
    expect(second).toHaveAccessibleDescription("W, X, Y, Z");
  });

  it("Edge: says so when a report has no products", () => {
    render(<ProductListCell labels={[]} />);

    expect(screen.getByText("Tidak ada produk")).toBeInTheDocument();
  });
});
