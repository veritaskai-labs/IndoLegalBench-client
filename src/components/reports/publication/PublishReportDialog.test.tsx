import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { PublicationGateway } from "@/lib/reports/publicationApi";
import { publishedCandidates, replaceCandidate } from "@/test/reportFixtures";
import type { ReplaceCandidates } from "@/types/reports";

import { PublishReportDialog } from "./PublishReportDialog";

function fakeGateway(overrides: Partial<PublicationGateway> = {}): PublicationGateway {
  return {
    publish: vi.fn().mockResolvedValue({ id: "pub-2", report_id: "r-2", version_no: 1, supersedes_id: null }),
    listPublished: vi.fn(),
    replaceCandidates: vi.fn().mockResolvedValue(publishedCandidates()),
    ...overrides,
  };
}

function renderDialog(gateway = fakeGateway()) {
  const onPublished = vi.fn();
  const onClose = vi.fn();
  render(
    <PublishReportDialog
      report={{ id: "r-2", title: "Perbandingan November" }}
      gateway={gateway}
      onPublished={onPublished}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Terbitkan laporan?" }));
  return { dialog, gateway, onPublished, onClose };
}

/** The replace option turns on once the same-product choices have loaded (SCRUM-373). */
async function replaceOption(dialog: ReturnType<typeof within>) {
  const radio = dialog.getByRole("radio", { name: "Ganti versi yang sedang terbit" });
  await waitFor(() => expect(radio).toBeEnabled());
  return radio;
}

// SCRUM-335 (PBI-17 AC9): Admin confirms before publishing, and may replace one current version instead.
describe("PublishReportDialog", () => {
  it("says who will see it and that there is no public link, schedule or notification", () => {
    const { dialog } = renderDialog();

    expect(dialog.getByText(/“Perbandingan November” akan muncul di daftar Laporan terbit/)).toBeInTheDocument();
    expect(dialog.getByText(/semua pengguna yang login/)).toBeInTheDocument();
    expect(dialog.getByText(/Tidak ada tautan publik, jadwal, atau notifikasi/)).toBeInTheDocument();
  });

  it("publishes as a new report by default and hands the new version to the page", async () => {
    const user = userEvent.setup();
    const { dialog, gateway, onPublished } = renderDialog();

    expect(dialog.getByRole("radio", { name: "Terbitkan sebagai laporan baru" })).toBeChecked();
    await user.click(dialog.getByRole("button", { name: "Terbitkan" }));

    expect(gateway.publish).toHaveBeenCalledWith("r-2", undefined);
    await waitFor(() =>
      expect(onPublished).toHaveBeenCalledWith({ id: "pub-2", report_id: "r-2", version_no: 1, supersedes_id: null }),
    );
  });

  it("replaces the chosen current version and says the old one stays", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog();

    await user.click(await replaceOption(dialog));
    expect(dialog.getByText(/Versi lama tetap tersimpan dan masih bisa dibuka/)).toBeInTheDocument();
    const choice = dialog.getByRole("combobox", { name: "Versi yang diganti" });
    expect(dialog.getByRole("button", { name: "Terbitkan" })).toBeDisabled();

    await user.selectOptions(choice, "pub-1");
    await user.click(dialog.getByRole("button", { name: "Terbitkan" }));

    expect(gateway.publish).toHaveBeenCalledWith("r-2", "pub-1");
  });

  // Positif, SCRUM-373 (feedback UAT sprint 4): the server lists only published reports with the same products,
  // for the report being published, and each choice shows its products and publish date.
  it("offers only the published versions with the same products, with products and date", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(
      fakeGateway({
        replaceCandidates: vi.fn().mockResolvedValue(
          publishedCandidates([
            replaceCandidate(),
            replaceCandidate({ report_id: "r-0", publication_id: "pub-0", title: "Perbandingan Oktober", version_no: 2, date: "2026-11-20T03:00:00Z" }),
          ]),
        ),
      }),
    );

    await user.click(await replaceOption(dialog));

    expect(gateway.replaceCandidates).toHaveBeenCalledWith("r-2");
    const options = within(dialog.getByRole("combobox", { name: "Versi yang diganti" })).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Pilih versi…",
      "Perbandingan Oktober (Versi 1) · AiYU, Produk B · terbit 18 Nov 2026",
      "Perbandingan Oktober (Versi 2) · AiYU, Produk B · terbit 20 Nov 2026",
    ]);
  });

  // Edge: the choices load when the dialog opens, so the option waits instead of opening an empty list.
  it("keeps the replace option off while the choices load, and publishing new still works", async () => {
    const user = userEvent.setup();
    const { dialog, gateway } = renderDialog(
      fakeGateway({ replaceCandidates: vi.fn(() => new Promise<ReplaceCandidates>(() => {})) }),
    );

    const replace = dialog.getByRole("radio", { name: "Ganti versi yang sedang terbit" });
    expect(replace).toBeDisabled();
    expect(replace).toHaveAccessibleDescription("Memuat versi terbit dengan produk yang sama…");
    await user.click(dialog.getByRole("button", { name: "Terbitkan" }));

    expect(gateway.publish).toHaveBeenCalledWith("r-2", undefined);
  });

  // Negatif, SCRUM-373: with no published report of the same products, the option is off and says why.
  it("turns the replace option off with a short reason when no version has the same products", async () => {
    const { dialog } = renderDialog(fakeGateway({ replaceCandidates: vi.fn().mockResolvedValue(publishedCandidates([])) }));

    const reason = await dialog.findByText("Belum ada laporan terbit yang membandingkan produk yang sama.");
    const replace = dialog.getByRole("radio", { name: "Ganti versi yang sedang terbit" });
    expect(replace).toBeDisabled();
    expect(replace).toHaveAccessibleDescription(reason.textContent ?? "");
    expect(dialog.queryByRole("combobox")).not.toBeInTheDocument();
    expect(dialog.getByRole("radio", { name: "Terbitkan sebagai laporan baru" })).toBeChecked();
  });

  // Negatif: a failed load keeps the option off and offers a retry that enables it.
  it("says when the choices could not be loaded and loads them again on retry", async () => {
    const user = userEvent.setup();
    const replaceCandidates = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(publishedCandidates());
    const { dialog } = renderDialog(fakeGateway({ replaceCandidates }));

    expect(await dialog.findByText("Gagal memuat laporan dengan produk yang sama. Coba lagi.")).toBeInTheDocument();
    expect(dialog.getByRole("radio", { name: "Ganti versi yang sedang terbit" })).toBeDisabled();
    await user.click(dialog.getByRole("button", { name: "Coba lagi" }));

    await replaceOption(dialog);
    expect(replaceCandidates).toHaveBeenCalledTimes(2);
  });

  // Negatif, SCRUM-373: the server checks the products again on publish (server#167), and the dialog says so.
  it("shows the server refusal when the products no longer match", async () => {
    const user = userEvent.setup();
    const { dialog, onPublished } = renderDialog(
      fakeGateway({ publish: vi.fn().mockRejectedValue(new ApiError(409, "REPORT_PRODUCTS_MISMATCH")) }),
    );

    await user.click(await replaceOption(dialog));
    await user.selectOptions(dialog.getByRole("combobox", { name: "Versi yang diganti" }), "pub-1");
    await user.click(dialog.getByRole("button", { name: "Terbitkan" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(/harus membandingkan produk yang sama/);
    expect(onPublished).not.toHaveBeenCalled();
  });

  // AC12: a refusal because of dev scores reads clearly, inside the dialog.
  it("shows the dev score refusal from the server", async () => {
    const user = userEvent.setup();
    const { dialog, onPublished } = renderDialog(
      fakeGateway({ publish: vi.fn().mockRejectedValue(new ApiError(409, "REPORT_HAS_DEV_SCORES")) }),
    );

    await user.click(dialog.getByRole("button", { name: "Terbitkan" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(/memuat skor dev, jadi tidak bisa diterbitkan/);
    expect(onPublished).not.toHaveBeenCalled();
  });

  it("closes with Batal without publishing", async () => {
    const user = userEvent.setup();
    const { dialog, gateway, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(onClose).toHaveBeenCalledWith(false);
    expect(gateway.publish).not.toHaveBeenCalled();
  });
});
