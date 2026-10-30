import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ModelParameterFields } from "./ModelParameterFields";

describe("ModelParameterFields (AC2)", () => {
  it("shows every parameter with its explanation", () => {
    render(<ModelParameterFields values={{}} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Temperature")).toHaveAttribute(
      "placeholder",
      "0.3",
    );
    expect(screen.getByLabelText("Effort")).toBeInTheDocument();
    expect(screen.getByLabelText("Thinking")).toBeInTheDocument();
    expect(screen.getByLabelText("Web search")).toBeInTheDocument();
    expect(
      screen.getByText("Klien memakai 0.3 sebagai nilai awal."),
    ).toBeInTheDocument();
  });

  it("reports what the admin types in the temperature", async () => {
    const onChange = vi.fn();
    render(<ModelParameterFields values={{}} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Temperature"), "1");

    expect(onChange).toHaveBeenCalledWith("temperature", "1");
  });

  it("reports the effort that was chosen", async () => {
    const onChange = vi.fn();
    render(<ModelParameterFields values={{}} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Effort"), "high");

    expect(onChange).toHaveBeenCalledWith("effort", "high");
  });

  it("reports a toggle as a boolean", async () => {
    const onChange = vi.fn();
    render(<ModelParameterFields values={{}} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Thinking"));

    expect(onChange).toHaveBeenCalledWith("thinking", true);
  });

  it("fills the fields from the values of the product being edited", () => {
    render(
      <ModelParameterFields
        values={{ temperature: "0.3", effort: "low", thinking: true }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Temperature")).toHaveValue("0.3");
    expect(screen.getByLabelText("Effort")).toHaveValue("low");
    expect(screen.getByLabelText("Thinking")).toBeChecked();
    expect(screen.getByLabelText("Web search")).not.toBeChecked();
  });
  it("says that a different set of parameters is a separate product", () => {
    render(<ModelParameterFields values={{}} onChange={vi.fn()} />);

    expect(
      screen.getByText(
        "Variasi parameter didaftarkan sebagai produk terpisah, misalnya deepseek1 dan deepseek2.",
      ),
    ).toBeInTheDocument();
  });
});