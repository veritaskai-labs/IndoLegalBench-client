import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PublicationGateway } from "@/lib/reports/publicationApi";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { devTestReport, firstReport } from "@/test/reportFixtures";
import type { PublishedReportListItem } from "@/types/reports";

import { ReplaceVersionDialog } from "./ReplaceVersionDialog";

const thisPublication: PublishedReportListItem = {
  id: "pub-1",
  report_id: "r-pub",
  version_no: 3,
  title: "Perbandingan Oktober",
  published_at: "2026-11-18T03:00:00Z",
  published_by: "admin-1",
  product_labels: ["AiYU"],
};

function gateways({
  publications = [thisPublication],
  reports = [firstReport({ id: "r-new", title: "Perbandingan November" })],
}: { publications?: PublishedReportListItem[]; reports?: ReturnType<typeof firstReport>[] } = {}) {
  const publication: PublicationGateway = {
    publish: vi.fn().mockResolvedValue({ id: "pub-2", report_id: "r-new", version_no: 4, supersedes_id: "pub-1" }),
    listPublished: vi.fn().mockResolvedValue(publications),
  };
  const saved: ReportsGateway = {
    list: vi.fn().mockResolvedValue(reports),
    detail: vi.fn(),
    pdf: vi.fn(),
    eligibleSessions: vi.fn(),
    create: vi.fn(),
    validate: vi.fn(),
  };
  return { publication, saved };
}

function renderDialog(g = gateways()) {
  const onReplaced = vi.fn();
  const onClose = vi.fn();
  render(
    <ReplaceVersionDialog
      report={{ id: "r-pub", title: "Perbandingan Oktober" }}
      gateway={g.publication}
      reportsGateway={g.saved}
      onReplaced={onReplaced}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Ganti versi laporan?" }));
  return { dialog, onReplaced, onClose, ...g };
}

// SCRUM-335 (AC9) "tombol ganti versi": replace a published report from its own page.
describe("ReplaceVersionDialog", () => {
  it("names the version being replaced and says it stays stored", async () => {
    const { dialog } = renderDialog();

    expect(await dialog.findByText(/“Perbandingan Oktober” \(Versi 3\) diganti oleh laporan yang Anda pilih/)).toBeInTheDocument();
    expect(dialog.getByText(/Versi lama tetap tersimpan dan masih bisa dibuka/)).toBeInTheDocument();
  });

  // AC12: only saved Test reports can stand in; dev, published and replaced reports are not offered.
  it("offers only saved Test reports as the replacement", async () => {
    const { dialog } = renderDialog(
      gateways({
        reports: [
          firstReport({ id: "r-new", title: "Perbandingan November" }),
          devTestReport({ id: "r-dev", title: "Dev + Test" }),
          firstReport({ id: "r-pub2", title: "Sudah terbit", status: "published" }),
          firstReport({ id: "r-old", title: "Digantikan", status: "superseded" }),
        ],
      }),
    );

    const choice = await dialog.findByRole("combobox", { name: "Laporan pengganti" });
    const options = within(choice).getAllByRole("option").map((option) => option.textContent);
    // Re-review: same titles are told apart by date and language.
    expect(options).toEqual(["Pilih laporan…", "Perbandingan November · 19 Nov 2026 · EN"]);
    expect(dialog.getByRole("button", { name: "Ganti versi" })).toBeDisabled();
  });

  it("publishes the chosen report as the next version of this one", async () => {
    const user = userEvent.setup();
    const { dialog, publication, onReplaced } = renderDialog();

    await user.selectOptions(await dialog.findByRole("combobox", { name: "Laporan pengganti" }), "r-new");
    await user.click(dialog.getByRole("button", { name: "Ganti versi" }));

    expect(publication.publish).toHaveBeenCalledWith("r-new", "pub-1");
    await waitFor(() => expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ version_no: 4 })));
  });

  it("says when no saved Test report can replace it", async () => {
    const { dialog } = renderDialog(gateways({ reports: [devTestReport({ id: "r-dev" })] }));

    expect(
      await dialog.findByText("Belum ada laporan tersimpan dengan nilai Test yang bisa menggantikannya. Buat laporan baru dulu."),
    ).toBeInTheDocument();
  });

  it("says when this report is no longer the current published version", async () => {
    const { dialog } = renderDialog(gateways({ publications: [] }));

    expect(
      await dialog.findByText("Laporan ini sudah tidak sedang terbit. Tutup dialog lalu muat ulang halaman."),
    ).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Ganti versi" })).toBeDisabled();
  });

  it("offers a retry when loading fails", async () => {
    const user = userEvent.setup();
    const g = gateways();
    vi.mocked(g.publication.listPublished).mockRejectedValueOnce(new Error("down"));
    const { dialog } = renderDialog(g);

    expect(await dialog.findByText("Gagal memuat pilihan laporan. Coba lagi.")).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Coba lagi" }));
    expect(await dialog.findByRole("combobox", { name: "Laporan pengganti" })).toBeInTheDocument();
  });
});
