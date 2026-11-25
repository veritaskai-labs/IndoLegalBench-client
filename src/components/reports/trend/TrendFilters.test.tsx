import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TrendFilters, type TrendFiltersProps } from "./TrendFilters";

const PRODUCTS = [
  { id: "p-a", name: "AiYU" },
  { id: "p-b", name: "Bravo" },
];

function renderFilters(overrides: Partial<TrendFiltersProps> = {}) {
  const props: TrendFiltersProps = {
    products: PRODUCTS,
    productId: "p-a",
    metric: "total",
    range: "all",
    scope: "test",
    scopes: ["test"],
    onProductChange: vi.fn(),
    onMetricChange: vi.fn(),
    onRangeChange: vi.fn(),
    onScopeChange: vi.fn(),
    ...overrides,
  };
  render(<TrendFilters {...props} />);
  return props;
}

function optionTexts(label: string): string[] {
  return within(screen.getByLabelText(label)).getAllByRole("option").map((option) => option.textContent ?? "");
}

describe("TrendFilters", () => {
  // Positive
  it("shows the picked product, metric and range, with the defaults total and all (AC2, AC3)", () => {
    // Arrange / Act
    renderFilters();

    // Assert
    expect(screen.getByLabelText("Produk")).toHaveValue("p-a");
    expect(screen.getByLabelText("Metrik")).toHaveValue("total");
    expect(screen.getByLabelText("Rentang waktu")).toHaveValue("all");
  });

  // Positive
  it("offers the products by name, the three metrics and the four ranges", () => {
    // Arrange / Act
    renderFilters();

    // Assert
    expect(optionTexts("Produk")).toEqual(["AiYU", "Bravo"]);
    expect(optionTexts("Metrik")).toEqual(["Skor total", "Deterministik", "Penilai LLM"]);
    expect(optionTexts("Rentang waktu")).toEqual(["3 bulan", "6 bulan", "12 bulan", "Semua"]);
  });

  // Positive
  it("reports each change with the value the reader picked", async () => {
    // Arrange
    const user = userEvent.setup();
    const props = renderFilters();

    // Act
    await user.selectOptions(screen.getByLabelText("Produk"), "p-b");
    await user.selectOptions(screen.getByLabelText("Metrik"), "llm");
    await user.selectOptions(screen.getByLabelText("Rentang waktu"), "6m");

    // Assert
    expect(props.onProductChange).toHaveBeenCalledWith("p-b");
    expect(props.onMetricChange).toHaveBeenCalledWith("llm");
    expect(props.onRangeChange).toHaveBeenCalledWith("6m");
  });

  // Positive
  it("offers the case type filter to a role that may see dev scores (AC12)", async () => {
    // Arrange
    const user = userEvent.setup();
    const props = renderFilters({ scopes: ["test", "dev", "dev_test"], scope: "test" });

    // Act
    await user.selectOptions(screen.getByLabelText("Jenis kasus"), "dev_test");

    // Assert
    expect(optionTexts("Jenis kasus")).toEqual(["Test only", "Dev only", "All"]);
    expect(screen.getByLabelText("Jenis kasus")).toHaveValue("test");
    expect(props.onScopeChange).toHaveBeenCalledWith("dev_test");
  });

  // Negative
  it("hides the case type filter completely when the role may only see test scores (AC1, AC12)", () => {
    // Arrange / Act
    renderFilters({ scopes: ["test"] });

    // Assert
    expect(screen.queryByLabelText("Jenis kasus")).not.toBeInTheDocument();
    expect(screen.queryByText("Dev only")).not.toBeInTheDocument();
  });

  // Edge case
  it("hides the case type filter while the role is still unknown", () => {
    // Arrange / Act
    renderFilters({ scopes: [] });

    // Assert
    expect(screen.queryByLabelText("Jenis kasus")).not.toBeInTheDocument();
  });
});
