import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { AiProduct } from "@/types/provider";
import { ToggleActiveDialog } from "./ToggleActiveDialog";

const product = { id: "p1", name: "DeepSeek", is_active: true } as AiProduct;

describe("ToggleActiveDialog in English", () => {
  it("asks in English and keeps the product name", () => {
    render(
      <LocaleProvider locale="en">
        <ToggleActiveDialog product={product} onClose={vi.fn()} onDone={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Deactivate AI product" })).toBeInTheDocument();
    expect(screen.getByText(/DeepSeek cannot be chosen for a new measurement/)).toBeInTheDocument();
  });
});
