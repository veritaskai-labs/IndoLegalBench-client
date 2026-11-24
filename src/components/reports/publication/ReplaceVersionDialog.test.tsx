import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { PublicationGateway } from "@/lib/reports/publicationApi";
import { publishedCandidates, replaceCandidate, savedCandidates } from "@/test/reportFixtures";
import type { ReplaceCandidates } from "@/types/reports";

import { ReplaceVersionDialog } from "./ReplaceVersionDialog";

function fakeGateway(replaceCandidates: PublicationGateway["replaceCandidates"] = vi.fn().mockResolvedValue(savedCandidates())) {
  return {
    publish: vi.fn().mockResolvedValue({ id: "pub-2", report_id: "r-new", version_no: 4, supersedes_id: "pub-1" }),
    listPublished: vi.fn(),
    replaceCandidates,
  } satisfies PublicationGateway;
}

function renderDialog(gateway = fakeGateway()) {
  const onReplaced = vi.fn();
  const onClose = vi.fn();
  render(
    <ReplaceVersionDialog
      report={{ id: "r-pub", title: "Perbandingan Oktober" }}
      gateway={gateway}
      onReplaced={onReplaced}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Ganti versi laporan?" }));
  return { dialog, gateway, onReplaced, onClose };
}

// SCRUM-335 (AC9) "tombol ganti versi": replace a published report from its own page.
// SCRUM-373 (feedback UAT sprint 4): only saved reports with the same products are offered (server#167).
describe("ReplaceVersionDialog", () => {
  it("names the report being replaced, says it stays stored and that only the same products can replace it", () => {
    const { dialog } = renderDialog();

    expect(dialog.getByText(/“Perbandingan Oktober” diganti oleh laporan yang Anda pilih/)).toBeInTheDocument();
    expect(dialog.getByText(/Hanya laporan yang membandingkan produk yang sama yang bisa dipilih/)).toBeInTheDocument();
    expect(dialog.getByText(/Versi lama tetap tersimpan dan masih bisa dibuka/)).toBeInTheDocument();
  });

  // Positif: the choices come from the server for this report, each with its products and creation date.
  it("offers the saved reports with the same products, with products and date", async () => {
    const { dialog, gateway } = renderDialog(
      fakeGateway(
        vi.fn().mockResolvedValue(
          savedCandidates([
            replaceCandidate({ report_id: "r-new", publication_id: null, version_no: null, title: "Perbandingan November", date: "2026-11-19T03:15:00Z" }),
            replaceCandidate({ report_id: "r-new2", publication_id: null, version_no: null, title: "Perbandingan November", date: "2026-11-21T03:15:00Z" }),
          ]),
        ),
      ),
    );

    const choice = await dialog.findByRole("combobox", { name: "Laporan pengganti" });
    const options = within(choice).getAllByRole("option").map((option) => option.textContent);

    expect(gateway.replaceCandidates).toHaveBeenCalledWith("r-pub");
    expect(options).toEqual([
      "Pilih laporan…",
      "Perbandingan November · AiYU, Produk B · dibuat 19 Nov 2026",
      "Perbandingan November · AiYU, Produk B · dibuat 21 Nov 2026",
    ]);
    expect(dialog.getByRole("button", { name: "Ganti versi" })).toBeDisabled();
  });

  // Positif: the chosen report is published as the next version of the one the server named.
  it("publishes the chosen report as the next version of this one", async () => {
    const user = userEvent.setup();
    const { dialog, gateway, onReplaced } = renderDialog(fakeGateway(vi.fn().mockResolvedValue(savedCandidates(undefined, "pub-7"))));

    await user.selectOptions(await dialog.findByRole("combobox", { name: "Laporan pengganti" }), "r-new");
    await user.click(dialog.getByRole("button", { name: "Ganti versi" }));

    expect(gateway.publish).toHaveBeenCalledWith("r-new", "pub-7");
    await waitFor(() => expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ version_no: 4 })));
  });

  it("says it is loading the choices", () => {
    const { dialog } = renderDialog(fakeGateway(vi.fn(() => new Promise<ReplaceCandidates>(() => {}))));

    expect(dialog.getByText("Memuat laporan dengan produk yang sama…")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Ganti versi" })).toBeDisabled();
  });

  // Negatif: no saved Test report compares the same products.
  it("says when no saved report with the same products can replace it", async () => {
    const { dialog } = renderDialog(fakeGateway(vi.fn().mockResolvedValue(savedCandidates([]))));

    expect(
      await dialog.findByText(
        "Belum ada laporan tersimpan bernilai Test yang membandingkan produk yang sama. Buat laporan baru dengan produk yang sama dulu.",
      ),
    ).toBeInTheDocument();
    expect(dialog.queryByRole("combobox")).not.toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Ganti versi" })).toBeDisabled();
  });

  // Edge: the page is stale. A replaced report gets 409 REPORT_NOT_PUBLISHABLE, and a report that is still saved
  // gets the other mode; both mean this report is no longer the current published version.
  it.each([
    ["was replaced meanwhile", vi.fn().mockRejectedValue(new ApiError(409, "REPORT_NOT_PUBLISHABLE"))],
    ["is not published", vi.fn().mockResolvedValue(publishedCandidates())],
    ["has no current version", vi.fn().mockResolvedValue({ ...savedCandidates(), replaces_publication_id: null })],
  ])("says the report is no longer published when it %s", async (_, replaceCandidates) => {
    const { dialog } = renderDialog(fakeGateway(replaceCandidates));

    expect(
      await dialog.findByText("Laporan ini sudah tidak sedang terbit. Tutup dialog lalu muat ulang halaman."),
    ).toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: "Coba lagi" })).not.toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Ganti versi" })).toBeDisabled();
  });

  // Negatif: any other failure can be tried again.
  it("offers a retry when loading fails", async () => {
    const user = userEvent.setup();
    const replaceCandidates = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(savedCandidates());
    const { dialog } = renderDialog(fakeGateway(replaceCandidates));

    expect(await dialog.findByText("Gagal memuat laporan dengan produk yang sama. Coba lagi.")).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Coba lagi" }));
    expect(await dialog.findByRole("combobox", { name: "Laporan pengganti" })).toBeInTheDocument();
  });

  // Negatif: the server checks the products again on publish (server#167), and the dialog says so.
  it("shows the server refusal when the products no longer match", async () => {
    const user = userEvent.setup();
    const gateway = fakeGateway();
    gateway.publish.mockRejectedValue(new ApiError(409, "REPORT_PRODUCTS_MISMATCH"));
    const { dialog, onReplaced } = renderDialog(gateway);

    await user.selectOptions(await dialog.findByRole("combobox", { name: "Laporan pengganti" }), "r-new");
    await user.click(dialog.getByRole("button", { name: "Ganti versi" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(/harus membandingkan produk yang sama/);
    expect(onReplaced).not.toHaveBeenCalled();
  });
});
