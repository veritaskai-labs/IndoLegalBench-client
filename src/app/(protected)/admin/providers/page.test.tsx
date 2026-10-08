import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import {
  createProduct,
  deleteProduct,
  listProducts,
  setProductActive,
  testConnection,
  updateProduct,
} from "@/lib/providers/providerApi";
import type { AiProduct } from "@/types/provider";
import ProvidersPage from "./page";

// providerApi has its own request tests; here only the page's reaction matters.
vi.mock("@/lib/providers/providerApi", () => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  setProductActive: vi.fn(),
  testConnection: vi.fn(),
  deleteProduct: vi.fn(),
}));

const list = vi.mocked(listProducts);
const create = vi.mocked(createProduct);
const update = vi.mocked(updateProduct);
const toggle = vi.mocked(setProductActive);
const test = vi.mocked(testConnection);
const remove = vi.mocked(deleteProduct);

function product(overrides: Partial<AiProduct> = {}): AiProduct {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "DeepSeek",
    provider_type: "openai_compatible",
    base_url: "https://api.deepseek.com/chat/completions",
    model_name: "deepseek-v4-flash",
    credential_hint: "a1b2",
    has_credential: true,
    rate_limit_per_minute: 10,
    monthly_budget_idr: "1500000.00",
    is_active: true,
    last_test_at: null,
    last_test_status: null,
    last_test_message: null,
    last_test_error_category: null,
    created_by: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-09-29T01:00:00Z",
    updated_at: "2026-09-29T01:00:00Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <ProvidersPage />
    </ToastProvider>,
  );
}

async function row(name: string) {
  return (await screen.findByRole("cell", { name })).closest("tr") as HTMLElement;
}

beforeEach(() => {
  for (const mock of [list, create, update, toggle, test, remove]) mock.mockReset();
});

describe("ProvidersPage list", () => {
  // Positive: every column from the ticket.
  it("lists active products with type, model, masked key, limit, Rupiah budget and status", async () => {
    list.mockResolvedValue([product()]);
    renderPage();

    const cells = within(await row("DeepSeek"));
    expect(cells.getByText("OpenAI-compatible")).toBeInTheDocument();
    expect(cells.getByText("deepseek-v4-flash")).toBeInTheDocument();
    expect(cells.getByLabelText("Kredensial berakhiran a1b2")).toBeInTheDocument();
    expect(cells.getByText("10")).toBeInTheDocument();
    expect(cells.getByText(/Rp\s?1\.500\.000/)).toBeInTheDocument();
    expect(cells.getByText("Aktif")).toBeInTheDocument();
    expect(cells.getByText("Belum pernah diuji")).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(true);
  });

  it("switches to the Nonaktif tab and asks for inactive products", async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce([product()]).mockResolvedValueOnce([product({ name: "GPT", is_active: false })]);
    renderPage();
    await row("DeepSeek");

    await user.click(screen.getByRole("tab", { name: "Nonaktif" }));

    expect(await row("GPT")).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("tab", { name: "Nonaktif" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the last failed test as a plain reason with a suggested fix, keeping the raw text under Lihat detail", async () => {
    list.mockResolvedValue([
      product({
        last_test_status: "failed",
        last_test_error_category: "access_denied",
        last_test_message: "provider returned HTTP 401",
        last_test_at: "2026-09-29T02:00:00Z",
      }),
    ]);
    renderPage();
    const cells = within(await row("DeepSeek"));

    expect(cells.getByText("Gagal: Akses ditolak karena API key tidak valid atau sudah tidak berlaku.")).toBeInTheDocument();
    expect(cells.getByText(/kolom Kredensial/)).toBeInTheDocument();
    expect(cells.getByText("Lihat detail")).toBeInTheDocument();
    expect(cells.getByText("provider returned HTTP 401")).not.toBeVisible();
  });

  // A product tested before SCRUM-133 has no category stored.
  it("falls back to a generic reason when the product has no category", async () => {
    list.mockResolvedValue([
      product({ last_test_status: "failed", last_test_message: "could not connect", last_test_at: "2026-09-29T02:00:00Z" }),
    ]);
    renderPage();
    const cells = within(await row("DeepSeek"));

    expect(cells.getByText(/belum dikenali aplikasi ini/)).toBeInTheDocument();
    expect(cells.getByText("could not connect")).toBeInTheDocument();
  });

  it("hides Lihat detail when there is no raw message", async () => {
    list.mockResolvedValue([
      product({ last_test_status: "failed", last_test_error_category: "timeout", last_test_message: null, last_test_at: "2026-09-29T02:00:00Z" }),
    ]);
    renderPage();
    const cells = within(await row("DeepSeek"));

    expect(cells.getByText(/15 detik/)).toBeInTheDocument();
    expect(cells.queryByText("Lihat detail")).not.toBeInTheDocument();
    expect(cells.queryByText(/tanpa keterangan/)).not.toBeInTheDocument();
  });

  // The raw message is third-party text, so it must never render as HTML.
  it("shows markup in the raw provider message as plain text, never as HTML", async () => {
    const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    list.mockResolvedValue([
      product({ last_test_status: "failed", last_test_error_category: "unknown", last_test_message: payload, last_test_at: "2026-09-29T02:00:00Z" }),
    ]);
    renderPage();
    const deepseekRow = await row("DeepSeek");

    expect(within(deepseekRow).getByText(payload)).toBeInTheDocument();
    expect(deepseekRow.querySelector("img, script")).toBeNull();
  });

  // Negative / states
  it("offers to register the first product when the list is empty", async () => {
    list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Belum ada produk AI aktif")).toBeInTheDocument();
  });

  it("shows an error with a retry that loads again", async () => {
    const user = userEvent.setup();
    list.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce([product()]);
    renderPage();

    expect(await screen.findByText("Gagal memuat produk AI.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /coba lagi/i }));

    expect(await row("DeepSeek")).toBeInTheDocument();
  });
});

describe("ProvidersPage connection test (AC3)", () => {
  it("shows a loading state for that product only, then ok with latency", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product(), product({ id: "33333333-3333-3333-3333-333333333333", name: "Gemini" })]);
    let finish: (value: { status: "ok"; latency_ms: number }) => void = () => undefined;
    test.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();
    const deepseek = await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Uji koneksi DeepSeek" }));

    expect(within(deepseek).getByText(/Menguji koneksi/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Uji koneksi DeepSeek" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Uji koneksi Gemini" })).toBeEnabled();

    finish({ status: "ok", latency_ms: 420 });

    expect(await within(deepseek).findByText(/Berhasil · 420 ms/)).toBeInTheDocument();
  });

  it("shows the reason and fix inline when the provider rejects the call", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product()]);
    test.mockResolvedValue({ status: "failed", error_category: "access_denied", message: "provider returned HTTP 401 invalid key" });
    renderPage();
    const deepseek = await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Uji koneksi DeepSeek" }));

    expect(await within(deepseek).findByText("Gagal: Akses ditolak karena API key tidak valid atau sudah tidak berlaku.")).toBeInTheDocument();
    expect(within(deepseek).queryByText(/^Gagal: provider returned/)).not.toBeInTheDocument();
  });

  it("opens the raw provider message from Lihat detail", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product()]);
    test.mockResolvedValue({ status: "failed", error_category: "access_denied", message: "provider returned HTTP 401 invalid key" });
    renderPage();
    const deepseek = await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Uji koneksi DeepSeek" }));
    await user.click(await within(deepseek).findByText("Lihat detail"));

    expect(within(deepseek).getByText("provider returned HTTP 401 invalid key")).toBeVisible();
  });

  it("says the test could not run when the request itself fails", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product()]);
    test.mockRejectedValue(new ApiError(500, "internal_error"));
    renderPage();
    const deepseek = await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Uji koneksi DeepSeek" }));

    expect(await within(deepseek).findByText("Uji koneksi tidak bisa dijalankan saat ini. Tunggu sebentar, lalu coba lagi.")).toBeInTheDocument();
  });
});

describe("ProvidersPage register and edit (AC1, AC2)", () => {
  async function fillCreate(user: ReturnType<typeof userEvent.setup>) {
    const dialog = within(screen.getByRole("dialog", { name: "Daftarkan produk AI" }));
    await user.type(dialog.getByLabelText("Nama"), "Claude");
    await user.selectOptions(dialog.getByLabelText("Jenis API"), "anthropic_messages");
    await user.type(dialog.getByLabelText("URL endpoint"), "https://api.anthropic.com/v1/messages");
    await user.type(dialog.getByLabelText("Model"), "claude-sonnet-5");
    await user.type(dialog.getByLabelText("Kredensial"), "sk-ant-rahasia-9z9z");
    await user.type(dialog.getByLabelText("Limit panggilan per menit"), "10");
    await user.type(dialog.getByLabelText("Budget per bulan (Rp)"), "2500000");
    return dialog;
  }

  it("registers a product with a Rupiah budget and reloads the list", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    create.mockResolvedValue(product({ name: "Claude" }));
    renderPage();
    await screen.findByText("Belum ada produk AI aktif");

    await user.click(screen.getAllByRole("button", { name: "Daftarkan produk" })[0]);
    const dialog = await fillCreate(user);
    expect(dialog.getByLabelText("Budget per bulan (Rp)")).toHaveValue("2.500.000");
    await user.click(dialog.getByRole("button", { name: "Simpan" }));

    expect(create).toHaveBeenCalledWith({
      name: "Claude",
      provider_type: "anthropic_messages",
      base_url: "https://api.anthropic.com/v1/messages",
      model_name: "claude-sonnet-5",
      credential: "sk-ant-rahasia-9z9z",
      rate_limit_per_minute: 10,
      monthly_budget_idr: "2500000",
    });
    expect(await screen.findByText("Produk AI terdaftar")).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("requires limit, budget and a key before sending anything", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Belum ada produk AI aktif");

    await user.click(screen.getAllByRole("button", { name: "Daftarkan produk" })[0]);
    const dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Simpan" }));

    expect(create).not.toHaveBeenCalled();
    expect(dialog.getByText("Kredensial wajib diisi.")).toBeInTheDocument();
    expect(dialog.getByText("Limit wajib diisi, bilangan bulat lebih dari 0.")).toBeInTheDocument();
    expect(dialog.getByText("Budget wajib diisi dan lebih dari Rp 0.")).toBeInTheDocument();
  });

  // UAT TC_52: required fields are marked.
  it("marks the required fields on the register form", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    renderPage();
    await screen.findByText("Belum ada produk AI aktif");

    await user.click(screen.getAllByRole("button", { name: "Daftarkan produk" })[0]);
    const dialog = within(screen.getByRole("dialog"));

    expect(dialog.getByText(/wajib diisi\./)).toBeInTheDocument();
    for (const label of ["Nama", "Jenis API", "URL endpoint", "Model", "Kredensial", "Limit panggilan per menit", "Budget per bulan (Rp)"]) {
      expect(dialog.getByLabelText(label)).toHaveAttribute("aria-required", "true");
    }
  });

  it("puts a taken name on the Nama field", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([]);
    create.mockRejectedValue(new ApiError(409, "AI_PRODUCT_NAME_TAKEN"));
    renderPage();
    await screen.findByText("Belum ada produk AI aktif");

    await user.click(screen.getAllByRole("button", { name: "Daftarkan produk" })[0]);
    const dialog = await fillCreate(user);
    await user.click(dialog.getByRole("button", { name: "Simpan" }));

    expect(await dialog.findByText("Nama produk sudah dipakai. Pilih nama lain.")).toBeInTheDocument();
  });

  // AC2: the stored key is never loaded into the form.
  it("edits without ever holding the old key, and only sends a key when a new one is typed", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product()]);
    update.mockResolvedValue(product({ rate_limit_per_minute: 30 }));
    renderPage();
    await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Ubah DeepSeek" }));
    const dialog = within(screen.getByRole("dialog", { name: "Ubah produk AI" }));
    const key = dialog.getByLabelText("Kredensial");

    expect(key).toHaveValue("");
    expect(key).toHaveAttribute("type", "password");
    expect(dialog.getByText(/Kredensial tersimpan \(…a1b2\), isi untuk mengganti/)).toBeInTheDocument();

    const limit = dialog.getByLabelText("Limit panggilan per menit");
    await user.clear(limit);
    await user.type(limit, "30");
    await user.click(dialog.getByRole("button", { name: "Simpan" }));

    expect(update.mock.calls[0]?.[1]).not.toHaveProperty("credential");
    expect(update.mock.calls[0]?.[1]).toMatchObject({ rate_limit_per_minute: 30, monthly_budget_idr: "1500000" });
    expect(await within(await row("DeepSeek")).findByText("30")).toBeInTheDocument();
  });
});

describe("ProvidersPage activate and deactivate (AC4)", () => {
  it("asks for confirmation, then moves the product out of the Aktif tab", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product()]);
    toggle.mockResolvedValue(product({ is_active: false }));
    renderPage();
    await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Nonaktifkan DeepSeek" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nonaktifkan produk AI" }));
    expect(dialog.getByText(/Riwayat pengukurannya tetap tersimpan/)).toBeInTheDocument();
    expect(toggle).not.toHaveBeenCalled();

    await user.click(dialog.getByRole("button", { name: "Nonaktifkan" }));

    expect(toggle).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111", false);
    await waitFor(() => expect(screen.queryByRole("cell", { name: "DeepSeek" })).not.toBeInTheDocument());
    expect(screen.getByText("Produk AI dinonaktifkan")).toBeInTheDocument();
  });

  it("keeps an inactive product openable for editing", async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce([]).mockResolvedValueOnce([product({ is_active: false })]);
    renderPage();
    await screen.findByText("Belum ada produk AI aktif");

    await user.click(screen.getByRole("tab", { name: "Nonaktif" }));
    await user.click(await screen.findByRole("button", { name: "Ubah DeepSeek" }));

    expect(screen.getByRole("dialog", { name: "Ubah produk AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aktifkan DeepSeek" })).toBeInTheDocument();
  });
});

describe("ProvidersPage delete (SCRUM-134 #2)", () => {
  it("confirms first, then removes only that product from the list with a toast", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product(), product({ id: "33333333-3333-3333-3333-333333333333", name: "Gemini" })]);
    remove.mockResolvedValue(undefined);
    renderPage();
    await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Hapus DeepSeek" }));
    const dialog = within(screen.getByRole("dialog", { name: "Hapus produk AI" }));
    expect(remove).not.toHaveBeenCalled();

    await user.click(dialog.getByRole("button", { name: "Hapus produk" }));

    expect(remove).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
    await waitFor(() => expect(screen.queryByRole("cell", { name: "DeepSeek" })).not.toBeInTheDocument());
    expect(screen.getByRole("cell", { name: "Gemini" })).toBeInTheDocument();
    expect(screen.getByText("DeepSeek dihapus")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers Hapus on the Nonaktif tab too", async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce([]).mockResolvedValueOnce([product({ is_active: false })]);
    renderPage();
    await screen.findByText("Belum ada produk AI aktif");

    await user.click(screen.getByRole("tab", { name: "Nonaktif" }));

    expect(await screen.findByRole("button", { name: "Hapus DeepSeek" })).toBeInTheDocument();
  });

  // Negative
  it("keeps the product when the admin cancels", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([product()]);
    renderPage();
    await row("DeepSeek");

    await user.click(screen.getByRole("button", { name: "Hapus DeepSeek" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));

    expect(remove).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "DeepSeek" })).toBeInTheDocument();
  });
});
