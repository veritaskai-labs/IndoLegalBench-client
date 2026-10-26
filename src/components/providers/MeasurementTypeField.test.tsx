import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MeasurementTypeField } from "./MeasurementTypeField";

describe("MeasurementTypeField", () => {
  // AC1: jenis pengukuran dipilih paling awal, dengan dua pilihan apa adanya.
  it("offers both measurement types", () => {
    render(<MeasurementTypeField value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /Otomatis/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Manual/ })).toBeInTheDocument();
  });

  // AC1: helper text menjelaskan arti tiap jenis, supaya Admin tidak salah pilih.
  it("explains what each type means", () => {
    render(<MeasurementTypeField value={null} onChange={vi.fn()} />);

    expect(screen.getByText(/dijalankan oleh sistem/i)).toBeInTheDocument();
    expect(
      screen.getByText(/dicatat tim legal/i),
    ).toBeInTheDocument();
  });

  // Positive: pilihan Admin diteruskan ke formulir induk.
  it("reports the chosen type", async () => {
    const onChange = vi.fn();
    render(<MeasurementTypeField value={null} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));

    expect(onChange).toHaveBeenCalledWith("manual");
  });

  // AC4: saat mengedit produk, jenisnya hanya bisa dibaca.
  it("locks the choice when the product is being edited", () => {
    render(
      <MeasurementTypeField value="otomatis" onChange={vi.fn()} readOnly />,
    );

    expect(screen.getByRole("radio", { name: /Otomatis/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Manual/ })).toBeDisabled();
  });
});