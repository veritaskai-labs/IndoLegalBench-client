import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { PublicationGateway } from "@/lib/reports/publicationApi";
import type { PublishedReportListItem } from "@/types/reports";

import { PublishReportDialog } from "./PublishReportDialog";

const current: PublishedReportListItem = {
  id: "pub-1",
  report_id: "r-1",
  version_no: 1,
  title: "Perbandingan Oktober",
  published_at: "2026-11-18T03:00:00Z",
  published_by: "admin-1",
  product_labels: ["AiYU"],
};

function fakeGateway(overrides: Partial<PublicationGateway> = {}): PublicationGateway {
  return {
    publish: vi.fn().mockResolvedValue({ id: "pub-2", report_id: "r-2", version_no: 1, supersedes_id: null }),
    listPublished: vi.fn().mockResolvedValue([current]),
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

    await user.click(dialog.getByRole("radio", { name: "Ganti versi yang sedang terbit" }));
    expect(dialog.getByText(/Versi lama tetap tersimpan dan masih bisa dibuka/)).toBeInTheDocument();
    const choice = await dialog.findByRole("combobox", { name: "Versi yang diganti" });
    expect(dialog.getByRole("button", { name: "Terbitkan" })).toBeDisabled();

    await user.selectOptions(choice, "Perbandingan Oktober (Versi 1)");
    await user.click(dialog.getByRole("button", { name: "Terbitkan" }));

    expect(gateway.publish).toHaveBeenCalledWith("r-2", "pub-1");
  });

  it("says when there is nothing to replace", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog(fakeGateway({ listPublished: vi.fn().mockResolvedValue([]) }));

    await user.click(dialog.getByRole("radio", { name: "Ganti versi yang sedang terbit" }));

    expect(await dialog.findByText("Belum ada laporan yang sedang terbit.")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Terbitkan" })).toBeDisabled();
  });

  it("says when the current versions could not be loaded", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog(fakeGateway({ listPublished: vi.fn().mockRejectedValue(new Error("down")) }));

    await user.click(dialog.getByRole("radio", { name: "Ganti versi yang sedang terbit" }));

    expect(await dialog.findByText("Gagal memuat daftar laporan terbit. Coba lagi.")).toBeInTheDocument();
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
