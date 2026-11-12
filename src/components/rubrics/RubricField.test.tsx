import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RubricField } from "./RubricField";

function setup(props: Partial<Parameters<typeof RubricField>[0]> = {}) {
  render(<RubricField label="Nama aspek 1" value="" onChange={vi.fn()} error={null} {...props} />);
  return screen.getByLabelText("Nama aspek 1");
}

describe("RubricField (AC7: catatan kecil dan contoh isian)", () => {
  // Positive: the note sits under the label and is read together with the input.
  it("shows the hint under the label and links it to the input", () => {
    // Arrange / Act
    const input = setup({ hint: "Nama singkat aspek yang dinilai." });

    // Assert
    expect(screen.getByText("Nama singkat aspek yang dinilai.")).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription("Nama singkat aspek yang dinilai.");
  });

  it("puts the placeholder on a text input", () => {
    // Arrange / Act
    const input = setup({ placeholder: "Contoh: Kesimpulan" });

    // Assert
    expect(input).toHaveAttribute("placeholder", "Contoh: Kesimpulan");
  });

  it("puts the placeholder on a textarea", () => {
    // Arrange / Act
    const input = setup({ multiline: true, placeholder: "Contoh: Ketepatan hasil akhir" });

    // Assert
    expect(input.tagName).toBe("TEXTAREA");
    expect(input).toHaveAttribute("placeholder", "Contoh: Ketepatan hasil akhir");
  });

  // Edge: a server error and the hint are both read, the error does not replace the hint.
  it("describes the input with both the hint and the server error", () => {
    // Arrange / Act
    const input = setup({ hint: "Nama singkat aspek.", error: "Nama aspek wajib diisi" });

    // Assert
    expect(input).toHaveAccessibleDescription("Nama singkat aspek. Nama aspek wajib diisi");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  // Negative: without a hint nothing extra is added, so existing fields keep their markup.
  it("adds no description and no placeholder when none is given", () => {
    // Arrange / Act
    const input = setup();

    // Assert
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("placeholder");
  });

  it("describes the input with the error alone when there is no hint", () => {
    // Arrange / Act
    const input = setup({ error: "Nama aspek wajib diisi" });

    // Assert
    expect(input).toHaveAccessibleDescription("Nama aspek wajib diisi");
  });
});
