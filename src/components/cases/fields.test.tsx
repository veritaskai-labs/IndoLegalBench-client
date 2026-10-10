import { render, screen } from "@testing-library/react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { TextAreaField, TextField } from "./fields";

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
      <TextAreaField label="Deskripsi" placeholder="Contoh jebakan" registration={registration("description")} />,
    );

    expect(screen.getByLabelText("Deskripsi")).toHaveAttribute("placeholder", "Contoh jebakan");
  });

  it("renders no placeholder attribute when none is given", () => {
    render(<TextAreaField label="Deskripsi" registration={registration("description")} />);

    expect(screen.getByLabelText("Deskripsi")).not.toHaveAttribute("placeholder");
  });
});
