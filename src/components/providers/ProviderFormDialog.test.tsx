import { render, screen, within } from "@testing-library/react";
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
  it("says that each package is a separate product when the product is manual", async () => {
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));

    expect(
      screen.getByText('"HO Pro" dan "HO Premium" adalah produk terpisah.'),
    ).toBeInTheDocument();
  });
});

describe("ProviderFormDialog save warning (AC2, AC3)", () => {
  it("asks for confirmation before a new product is saved", async () => {
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(
      screen.getByRole("heading", { name: "Simpan sebagai produk Manual?" }),
    ).toBeInTheDocument();
  });

  it("goes back to the form when the admin cancels the warning", async () => {
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    const warning = screen
      .getByRole("heading", { name: "Simpan sebagai produk Manual?" })
      .closest("dialog") as HTMLElement;
    await userEvent.click(
      within(warning).getByRole("button", { name: "Batal" }),
    );

    expect(
      screen.queryByRole("heading", { name: "Simpan sebagai produk Manual?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nama penyedia")).toBeInTheDocument();
  });

  it("says a manual product still waits for the server once the admin confirms", async () => {
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, simpan" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Menyimpan produk manual menunggu dukungan server (PBI-23-BE-1).",
    );
  });

  it("refuses a temperature outside the range before asking for confirmation", async () => {
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Temperature"), "2.5");
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Temperature harus angka antara 0 dan 2.",
    );
    expect(
      screen.queryByRole("heading", { name: /^Simpan sebagai produk/ }),
    ).not.toBeInTheDocument();
  });
    await userEvent.type(screen.getByLabelText("Nama penyedia"), "Hukumonline");
    await userEvent.type(
      screen.getByLabelText("Alamat situs"),
      "https://hukumonline.com",
    );
});

describe("ProviderFormDialog manual validation (AC3)", () => {
  it("asks for the vendor name and the site before the warning appears", async () => {
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(screen.getByText("Nama penyedia wajib diisi.")).toBeInTheDocument();
    expect(
      screen.getByText("Isi URL lengkap yang diawali http:// atau https://."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Simpan sebagai produk/ }),
    ).not.toBeInTheDocument();
  });
});