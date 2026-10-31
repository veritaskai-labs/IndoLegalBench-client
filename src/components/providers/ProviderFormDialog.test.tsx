import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import {
  createProduct,
  testConnection,
  updateProduct,
} from "@/lib/providers/providerApi";
import type { AiProduct, ConnectionTest } from "@/types/provider";

import { ProviderFormDialog } from "./ProviderFormDialog";

vi.mock("@/lib/providers/providerApi", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  testConnection: vi.fn(),
}));

const MANUAL_PRODUCT = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Hukumonline Pro",
  measurement_type: "manual",
  vendor_name: "Hukumonline",
  site_url: "https://hukumonline.com",
  access_note: "Login lewat akun tim legal",
  manual_params: "mode pro",
  has_credential: false,
  is_active: true,
  created_by: "22222222-2222-2222-2222-222222222222",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
} satisfies AiProduct;

const AUTOMATIC_PRODUCT = {
  id: "33333333-3333-3333-3333-333333333333",
  name: "DeepSeek",
  measurement_type: "automatic",
  provider_type: "openai_compatible",
  base_url: "https://api.deepseek.com/chat/completions",
  model_name: "deepseek-v4-flash",
  credential_hint: "a1b2",
  has_credential: true,
  rate_limit_per_minute: 10,
  monthly_budget_idr: "1500000.00",
  model_params: { temperature: 0.3, effort: "high", thinking: true },
  is_active: true,
  created_by: "22222222-2222-2222-2222-222222222222",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
} satisfies AiProduct;

beforeEach(() => {
  vi.clearAllMocks();
});

function renderDialog() {
  render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);
}

/** Isian minimum produk manual supaya lolos validasi AC3. */
async function fillManual() {
  await userEvent.type(screen.getByLabelText("Nama"), "Hukumonline Pro");
  await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
  await userEvent.type(screen.getByLabelText("Nama penyedia"), "Hukumonline");
  await userEvent.type(
    screen.getByLabelText("Alamat situs"),
    "https://hukumonline.com",
  );
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

  // AC3: paket berbeda didaftarkan sebagai produk terpisah.
  it("says that each package is a separate product when the product is manual", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));

    expect(
      screen.getByText('"HO Pro" dan "HO Premium" adalah produk terpisah.'),
    ).toBeInTheDocument();
  });

  // AC2: uji koneksi butuh produk yang sudah ada di server.
  it("offers the connection test only after the product exists", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Uji koneksi" })).toBeDisabled();
    expect(
      screen.getByText("Uji koneksi tersedia setelah produk tersimpan."),
    ).toBeInTheDocument();
  });

  it("runs the connection test for the product being edited", async () => {
    vi.mocked(testConnection).mockResolvedValue({ status: "ok" } as ConnectionTest);
    render(
      <ProviderFormDialog
        product={AUTOMATIC_PRODUCT}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Uji koneksi" }));

    expect(testConnection).toHaveBeenCalledWith(AUTOMATIC_PRODUCT.id);
    expect(await screen.findByText("Koneksi berhasil.")).toBeInTheDocument();
  });
});

describe("ProviderFormDialog save warning (AC2, AC4)", () => {
  it("asks for confirmation before a new product is saved", async () => {
    renderDialog();

    await fillManual();
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(
      screen.getByRole("heading", { name: "Simpan sebagai produk Manual?" }),
    ).toBeInTheDocument();
  });

  it("goes back to the form when the admin cancels the warning", async () => {
    renderDialog();

    await fillManual();
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

  it("registers a manual product with its own fields", async () => {
    vi.mocked(createProduct).mockResolvedValue(MANUAL_PRODUCT);
    const onSaved = vi.fn();
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={onSaved} />);

    await fillManual();
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, simpan" }));

    expect(createProduct).toHaveBeenCalledWith({
      name: "Hukumonline Pro",
      measurement_type: "manual",
      vendor_name: "Hukumonline",
      site_url: "https://hukumonline.com",
      access_note: null,
      manual_params: null,
    });
    expect(onSaved).toHaveBeenCalledWith(MANUAL_PRODUCT);
  });

  it("registers an automatic product with its credential and parameters", async () => {
    vi.mocked(createProduct).mockResolvedValue(AUTOMATIC_PRODUCT);
    render(<ProviderFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nama"), "DeepSeek");
    await userEvent.selectOptions(
      screen.getByLabelText("Jenis API"),
      "openai_compatible",
    );
    await userEvent.type(
      screen.getByLabelText("URL endpoint"),
      "https://api.deepseek.com/chat/completions",
    );
    await userEvent.type(screen.getByLabelText("Model"), "deepseek-v4-flash");
    await userEvent.type(screen.getByLabelText("Kredensial"), "sk-rahasia-9z9z");
    await userEvent.type(screen.getByLabelText("Limit panggilan per menit"), "10");
    await userEvent.type(screen.getByLabelText("Budget per bulan (Rp)"), "1500000");
    await userEvent.type(screen.getByLabelText("Temperature"), "0.3");
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, simpan" }));

    expect(createProduct).toHaveBeenCalledWith({
      name: "DeepSeek",
      measurement_type: "automatic",
      provider_type: "openai_compatible",
      base_url: "https://api.deepseek.com/chat/completions",
      model_name: "deepseek-v4-flash",
      credential: "sk-rahasia-9z9z",
      rate_limit_per_minute: 10,
      monthly_budget_idr: "1500000",
      model_params: { temperature: 0.3 },
    });
  });

  it("refuses a temperature outside the range before asking for confirmation", async () => {
    renderDialog();

    await userEvent.type(screen.getByLabelText("Temperature"), "2.5");
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Temperature harus angka antara 0 dan 2.",
    );
    expect(
      screen.queryByRole("heading", { name: /^Simpan sebagai produk/ }),
    ).not.toBeInTheDocument();
  });
});

describe("ProviderFormDialog manual validation (AC3)", () => {
  it("asks for the vendor name and the site before the warning appears", async () => {
    renderDialog();

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

describe("ProviderFormDialog editing (AC4)", () => {
  it("fills the form from the manual product being edited", () => {
    render(
      <ProviderFormDialog
        product={MANUAL_PRODUCT}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Manual/ })).toBeChecked();
    expect(screen.getByLabelText("Nama penyedia")).toHaveValue("Hukumonline");
    expect(screen.getByLabelText("Alamat situs")).toHaveValue(
      "https://hukumonline.com",
    );
    expect(screen.getByLabelText("Catatan akses")).toHaveValue(
      "Login lewat akun tim legal",
    );
    expect(screen.getByLabelText("Parameter")).toHaveValue("mode pro");
  });

  it("fills the stored model parameters of an automatic product", () => {
    render(
      <ProviderFormDialog
        product={AUTOMATIC_PRODUCT}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Temperature")).toHaveValue("0.3");
    expect(screen.getByLabelText("Effort")).toHaveValue("high");
    expect(screen.getByLabelText("Thinking")).toBeChecked();
    expect(screen.getByLabelText("Web search")).not.toBeChecked();
  });

  it("sends the manual fields of the product being edited", async () => {
    const saved = { ...MANUAL_PRODUCT, access_note: "Catatan baru" };
    vi.mocked(updateProduct).mockResolvedValue(saved);
    const onSaved = vi.fn();
    render(
      <ProviderFormDialog
        product={MANUAL_PRODUCT}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    await userEvent.clear(screen.getByLabelText("Catatan akses"));
    await userEvent.type(screen.getByLabelText("Catatan akses"), "Catatan baru");
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(updateProduct).toHaveBeenCalledWith(MANUAL_PRODUCT.id, {
      name: "Hukumonline Pro",
      measurement_type: "manual",
      vendor_name: "Hukumonline",
      site_url: "https://hukumonline.com",
      access_note: "Catatan baru",
      manual_params: "mode pro",
    });
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it("sends the model parameters of the automatic product being edited", async () => {
    vi.mocked(updateProduct).mockResolvedValue(AUTOMATIC_PRODUCT);
    render(
      <ProviderFormDialog
        product={AUTOMATIC_PRODUCT}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText("Web search"));
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(updateProduct).toHaveBeenCalledWith(AUTOMATIC_PRODUCT.id, {
      name: "DeepSeek",
      measurement_type: "automatic",
      provider_type: "openai_compatible",
      base_url: "https://api.deepseek.com/chat/completions",
      model_name: "deepseek-v4-flash",
      rate_limit_per_minute: 10,
      monthly_budget_idr: "1500000",
      model_params: {
        temperature: 0.3,
        effort: "high",
        thinking: true,
        web_search: true,
      },
    });
  });
});

describe("ProviderFormDialog switching the measurement type (AC4)", () => {
  it("clears the automatic fields when the admin switches to manual", async () => {
    renderDialog();

    await userEvent.type(screen.getByLabelText("Model"), "deepseek-v4-flash");
    await userEvent.type(screen.getByLabelText("Temperature"), "0.3");
    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Otomatis/ }));

    expect(screen.getByLabelText("Model")).toHaveValue("");
    expect(screen.getByLabelText("Temperature")).toHaveValue("");
  });

  it("clears the manual fields when the admin switches to automatic", async () => {
    renderDialog();

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.type(screen.getByLabelText("Nama penyedia"), "Hukumonline");
    await userEvent.click(screen.getByRole("radio", { name: /Otomatis/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));

    expect(screen.getByLabelText("Nama penyedia")).toHaveValue("");
  });
});

describe("ProviderFormDialog changing the type of an existing product (AC4)", () => {
  it("lets the admin pick the type again while editing", () => {
    render(
      <ProviderFormDialog
        product={AUTOMATIC_PRODUCT}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Manual/ })).toBeEnabled();
  });

  it("confirms the switch and sends the new type", async () => {
    vi.mocked(updateProduct).mockResolvedValue(MANUAL_PRODUCT);
    render(
      <ProviderFormDialog
        product={AUTOMATIC_PRODUCT}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.type(screen.getByLabelText("Nama penyedia"), "Hukumonline");
    await userEvent.type(
      screen.getByLabelText("Alamat situs"),
      "https://hukumonline.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(
      screen.getByText("Isian jenis sebelumnya akan hilang setelah disimpan."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ya, simpan" }));

    expect(updateProduct).toHaveBeenCalledWith(AUTOMATIC_PRODUCT.id, {
      name: "DeepSeek",
      measurement_type: "manual",
      vendor_name: "Hukumonline",
      site_url: "https://hukumonline.com",
      access_note: null,
      manual_params: null,
    });
  });

  it("explains and locks the type when the server refuses the switch", async () => {
    // ApiError dibuat lewat prototype-nya supaya instanceof benar tanpa menebak konstruktor.
    const refusal = Object.assign(Object.create(ApiError.prototype), {
      status: 422,
      code: "MEASUREMENT_TYPE_IMMUTABLE",
    }) as ApiError;
    vi.mocked(updateProduct).mockRejectedValue(refusal);
    render(
      <ProviderFormDialog
        product={AUTOMATIC_PRODUCT}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: /Manual/ }));
    await userEvent.type(screen.getByLabelText("Nama penyedia"), "Hukumonline");
    await userEvent.type(
      screen.getByLabelText("Alamat situs"),
      "https://hukumonline.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, simpan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Jenis pengukuran tidak bisa diubah karena produk sudah punya riwayat pengukuran. Nonaktifkan produk ini lalu daftarkan produk baru dengan nama berbeda.",
    );
    expect(screen.getByRole("radio", { name: /Manual/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Otomatis/ })).toBeChecked();
  });
});