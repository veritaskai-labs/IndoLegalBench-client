import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField";
import { Input } from "./Input";

function renderField(props: Partial<React.ComponentProps<typeof FormField>> = {}) {
  return render(
    <FormField label="Nama suite" {...props}>
      {(control) => <Input {...control} />}
    </FormField>,
  );
}

describe("FormField", () => {
  it("labels the control so it can be found by its label", () => {
    renderField();

    expect(screen.getByLabelText("Nama suite")).toBeInstanceOf(HTMLInputElement);
  });

  it("marks a required field visibly and for assistive tech", () => {
    renderField({ required: true });

    expect(screen.getByText("*")).toHaveClass("text-accent");
    expect(screen.getByLabelText(/Nama suite/)).toHaveAttribute("aria-required", "true");
  });

  it("tags an optional field with the Opsional label", () => {
    renderField({ optional: true });

    expect(screen.getByText("Opsional")).toBeInTheDocument();
  });

  it("describes the control with its hint", () => {
    renderField({ hint: "Maksimal 80 karakter" });

    const input = screen.getByLabelText("Nama suite");
    const hint = screen.getByText("Maksimal 80 karakter");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("announces the error, flags the control invalid and keeps the hint linked", () => {
    renderField({ hint: "Maksimal 80 karakter", error: "Nama suite wajib diisi" });

    const input = screen.getByLabelText("Nama suite");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Nama suite wajib diisi");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
    expect(input.getAttribute("aria-describedby")).toContain(
      screen.getByText("Maksimal 80 karakter").id,
    );
  });

  it("has no description and is not invalid when there is nothing to say", () => {
    renderField();

    const input = screen.getByLabelText("Nama suite");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("gives two fields distinct ids", () => {
    render(
      <>
        <FormField label="A">{(c) => <Input {...c} />}</FormField>
        <FormField label="B">{(c) => <Input {...c} />}</FormField>
      </>,
    );

    expect(screen.getByLabelText("A").id).not.toBe(screen.getByLabelText("B").id);
  });
});
