import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProviderFormDialog } from "./ProviderFormDialog";

function renderDialog() {
  render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);
}

describe("ProviderFormDialog measurement type (SCRUM-202)", () => {
  // AC1, AC2: produk otomatis tetap meminta kredensial dan batas pemakaian.
  it("asks for the credential and the limits of an automatic product", () => {
    renderDialog();

    expect(screen.getByRole("radio", { name: /Otomatis/ })).toBeChecked();
    expect(screen.getByText("Kredensial")).toBeInTheDocument();
    expect(screen.getByText("Limit panggilan per menit")).toBeInTheDocument();
  });

  // AC3: produk manual tidak punya kredensial, batas pemakaian, dan uji koneksi.
  it("swaps the fields when the product is manual", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));

    expect(screen.queryByText("Kredensial")).not.toBeInTheDocument();
    expect(screen.queryByText("Limit panggilan per menit")).not.toBeInTheDocument();
    expect(screen.getByText("Nama penyedia")).toBeInTheDocument();
    expect(screen.getByText("Alamat situs")).toBeInTheDocument();
    expect(screen.getByText("Catatan akses")).toBeInTheDocument();
  });

  // AC3: catatan akses tidak boleh dipakai menyimpan kata sandi.
  it("warns not to store a password in the access note", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));

    expect(screen.getByText(/jangan isi kata sandi/i)).toBeInTheDocument();
  });
});