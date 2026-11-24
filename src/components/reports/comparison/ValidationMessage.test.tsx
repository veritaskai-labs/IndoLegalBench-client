import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ValidationMessage } from "./ValidationMessage";

describe("ValidationMessage", () => {
  it("labels an error so it does not rely on the red color alone", () => {
    render(<ValidationMessage level="error">Sesi yang dipilih memakai suite yang berbeda.</ValidationMessage>);

    const message = screen.getByText("Sesi yang dipilih memakai suite yang berbeda.").closest("[data-level]");
    expect(message).toHaveAttribute("data-level", "error");
    expect(message).toHaveTextContent(/^Error: Sesi yang dipilih memakai suite yang berbeda\.$/);
    expect(message).toHaveClass("text-red-800");
  });

  it("labels a warning as Peringatan in yellow", () => {
    render(<ValidationMessage level="warning">Jumlah percobaan antar sesi berbeda.</ValidationMessage>);

    const message = screen.getByText("Jumlah percobaan antar sesi berbeda.").closest("[data-level]");
    expect(message).toHaveAttribute("data-level", "warning");
    expect(message).toHaveTextContent(/^Peringatan: Jumlah percobaan antar sesi berbeda\.$/);
    expect(message).toHaveClass("text-amber-900");
  });

  it("keeps the icon out of the accessible text", () => {
    const { container } = render(<ValidationMessage level="error">Pesan.</ValidationMessage>);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
