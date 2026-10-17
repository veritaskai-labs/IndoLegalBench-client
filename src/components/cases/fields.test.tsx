import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseFormRegisterReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { SelectField, TextAreaField, TextField } from "./fields";

// Registrasi palsu: field ini tidak butuh form sungguhan untuk diuji.
function registration(name: string): UseFormRegisterReturn {
  return { name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() };
}

describe("TextField", () => {
  // Positive: SCRUM-131, contoh isian sebagai placeholder.
  it("shows the placeholder it is given", () => {
    render(<TextField label="Pasal" placeholder="156" registration={registration("pasal")} />);

    expect(screen.getByLabelText("Pasal")).toHaveAttribute("placeholder", "156");
  });

  // Negative: tanpa contoh, tidak ada placeholder kosong yang ikut dirender.
  it("renders no placeholder attribute when none is given", () => {
    render(<TextField label="Pasal" registration={registration("pasal")} />);

    expect(screen.getByLabelText("Pasal")).not.toHaveAttribute("placeholder");
  });

  // Corner: tanpa hint dan tanpa error, tidak ada aria-describedby yang menggantung.
  it("is not described by anything when it has no hint and no error", () => {
    render(<TextField label="Pasal" registration={registration("pasal")} />);

    expect(screen.getByLabelText("Pasal")).not.toHaveAttribute("aria-describedby");
  });
});

describe("TextAreaField", () => {
  it("shows the placeholder it is given", () => {
    render(
      <TextAreaField
        label="Deskripsi"
        placeholder="Contoh jebakan"
        registration={registration("description")}
      />,
    );

    expect(screen.getByLabelText("Deskripsi")).toHaveAttribute("placeholder", "Contoh jebakan");
  });

  it("renders no placeholder attribute when none is given", () => {
    render(<TextAreaField label="Deskripsi" registration={registration("description")} />);

    expect(screen.getByLabelText("Deskripsi")).not.toHaveAttribute("placeholder");
  });
});

describe("SelectField", () => {
  const OPTIONS = [
    { value: "name_only", label: "Nama Peraturan saja" },
    { value: "pasal", label: "Pasal" },
    { value: "pasal_angka", label: "Pasal + Angka" },
  ];

  // Positive
  it("is a select named by its label, with every option and the current value chosen", () => {
    // Arrange
    render(
      <SelectField label="Bentuk rujukan" value="pasal" options={OPTIONS} onChange={vi.fn()} />,
    );

    // Act
    const select = screen.getByRole("combobox", { name: "Bentuk rujukan" });

    // Assert
    expect(select).toHaveValue("pasal");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Nama Peraturan saja",
      "Pasal",
      "Pasal + Angka",
    ]);
  });

  it("calls onChange with the value of the chosen option", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField label="Bentuk rujukan" value="pasal" options={OPTIONS} onChange={onChange} />,
    );

    // Act
    await user.selectOptions(screen.getByLabelText("Bentuk rujukan"), "pasal_angka");

    // Assert
    expect(onChange).toHaveBeenCalledExactlyOnceWith("pasal_angka");
  });

  // Edge: the browser can report a value that is not one of the options (e.g. a stale DOM).
  it("ignores a value that is not one of the options", () => {
    // Arrange
    const onChange = vi.fn();
    render(
      <SelectField label="Bentuk rujukan" value="pasal" options={OPTIONS} onChange={onChange} />,
    );

    // Act
    fireEvent.change(screen.getByLabelText("Bentuk rujukan"), { target: { value: "tidak_ada" } });

    // Assert
    expect(onChange).not.toHaveBeenCalled();
  });

  // Negative
  it("cannot be changed when disabled", () => {
    // Arrange + Act
    render(
      <SelectField
        label="Bentuk rujukan"
        value="pasal"
        options={OPTIONS}
        onChange={vi.fn()}
        disabled
      />,
    );

    // Assert
    expect(screen.getByLabelText("Bentuk rujukan")).toBeDisabled();
  });

  // Corner
  it("ties the hint to the select", () => {
    // Arrange + Act
    render(
      <SelectField
        label="Bentuk rujukan"
        value="pasal"
        options={OPTIONS}
        onChange={vi.fn()}
        hint="Pilih seberapa dalam rujukan ini."
      />,
    );

    // Assert
    expect(screen.getByLabelText("Bentuk rujukan")).toHaveAccessibleDescription(
      "Pilih seberapa dalam rujukan ini.",
    );
  });

  it("marks the select invalid and ties the error to it", () => {
    // Arrange + Act
    render(
      <SelectField
        label="Bentuk rujukan"
        value="pasal"
        options={OPTIONS}
        onChange={vi.fn()}
        error="Bentuk rujukan wajib dipilih."
      />,
    );

    // Assert
    const select = screen.getByLabelText("Bentuk rujukan");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Bentuk rujukan wajib dipilih.");
  });

  it("has no description when it has no hint and no error", () => {
    // Arrange + Act
    render(
      <SelectField label="Bentuk rujukan" value="pasal" options={OPTIONS} onChange={vi.fn()} />,
    );

    // Assert
    expect(screen.getByLabelText("Bentuk rujukan")).not.toHaveAttribute("aria-describedby");
  });
});
