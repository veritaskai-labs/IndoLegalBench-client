import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { deleteProduct } from "@/lib/providers/providerApi";
import type { AiProduct } from "@/types/provider";
import { DeleteProductDialog } from "./DeleteProductDialog";

vi.mock("@/lib/providers/providerApi", () => ({ deleteProduct: vi.fn() }));
const remove = vi.mocked(deleteProduct);

const product = { id: "p1", name: "DeepSeek" } as AiProduct;

beforeEach(() => {
  remove.mockReset();
});

describe("DeleteProductDialog (SCRUM-134 #2)", () => {
  it("names the product, says what disappears and what stays, before sending anything", () => {
    render(<DeleteProductDialog product={product} onClose={vi.fn()} onDone={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Hapus produk AI" });
    expect(dialog).toHaveTextContent("Hapus DeepSeek?");
    expect(dialog).toHaveTextContent(/hilang dari daftar Aktif maupun Nonaktif/);
    expect(dialog).toHaveTextContent(/Riwayat pengukuran dan laporan .* tetap tersimpan/);
    expect(remove).not.toHaveBeenCalled();
  });

  it("points to Nonaktifkan for an admin who only wants to pause the product", () => {
    render(<DeleteProductDialog product={product} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByText(/Kalau hanya ingin berhenti memakainya sementara, pilih Nonaktifkan\./)).toBeInTheDocument();
  });

  it("deletes when confirmed and reports back", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    remove.mockResolvedValue(undefined);
    render(<DeleteProductDialog product={product} onClose={vi.fn()} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Hapus produk" }));

    expect(remove).toHaveBeenCalledWith("p1");
    expect(onDone).toHaveBeenCalled();
  });

  // Negative
  it("keeps the dialog open with a retry message when the delete fails", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    remove.mockRejectedValue(new ApiError(500, "internal_error"));
    render(<DeleteProductDialog product={product} onClose={vi.fn()} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Hapus produk" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Produk gagal dihapus. Tunggu sebentar, lalu coba lagi.");
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Hapus produk" })).toBeEnabled();
  });

  // TODO(SCRUM-133): assumes the server answers 404 for a product that is already gone.
  it("says the product is already gone when the server answers 404", async () => {
    const user = userEvent.setup();
    remove.mockRejectedValue(new ApiError(404, "not_found"));
    render(<DeleteProductDialog product={product} onClose={vi.fn()} onDone={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Hapus produk" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Produk ini sudah tidak ada, mungkin sudah dihapus admin lain. Muat ulang halaman untuk melihat daftar terbaru.",
    );
  });

  it("locks the confirm button while the request runs, so it is not sent twice", async () => {
    const user = userEvent.setup();
    remove.mockReturnValue(new Promise(() => undefined));
    render(<DeleteProductDialog product={product} onClose={vi.fn()} onDone={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Hapus produk" }));
    const busy = screen.getByRole("button", { name: "Menghapus…" });
    await user.click(busy);

    expect(busy).toBeDisabled();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("closes on Batal without deleting", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DeleteProductDialog product={product} onClose={onClose} onDone={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Batal" }));

    expect(onClose).toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  // Security: an admin typed the name, but it is still shown back as text.
  it("shows markup in the product name as plain text", () => {
    const name = '<img src=x onerror="alert(1)">';
    render(<DeleteProductDialog product={{ ...product, name }} onClose={vi.fn()} onDone={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Hapus produk AI" });
    expect(dialog).toHaveTextContent(`Hapus ${name}?`);
    expect(dialog.querySelector("img")).toBeNull();
  });
});
