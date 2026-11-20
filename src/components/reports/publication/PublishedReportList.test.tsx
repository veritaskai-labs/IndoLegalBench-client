import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PublicationGateway } from "@/lib/reports/publicationApi";
import type { PublishedReportListItem } from "@/types/reports";

import { PublishedReportList } from "./PublishedReportList";

function item(overrides: Partial<PublishedReportListItem> = {}): PublishedReportListItem {
  return {
    id: "pub-2",
    report_id: "r-2",
    version_no: 2,
    title: "Perbandingan November",
    published_at: "2026-11-18T03:00:00Z",
    published_by: "admin-1",
    product_labels: ["AiYU", "Produk B"],
    ...overrides,
  };
}

function gatewayWith(listPublished: PublicationGateway["listPublished"]): PublicationGateway {
  return { publish: vi.fn(), listPublished };
}

// SCRUM-335 (PBI-17 AC9, AC10): every signed-in user reads the reports that are currently published.
describe("PublishedReportList", () => {
  it("sits under Laporan with its own heading and waits for the list", () => {
    render(<PublishedReportList gateway={gatewayWith(vi.fn(() => new Promise<PublishedReportListItem[]>(() => {})))} />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Laporan" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("heading", { level: 1, name: "Laporan terbit" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Memuat daftar laporan terbit…");
  });

  it("lists each current version with its title, version, products and date", async () => {
    render(<PublishedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([item()]))} />);

    const row = (await screen.findByRole("rowheader", { name: "Perbandingan November" })).closest("tr") as HTMLElement;
    expect(within(row).getByRole("link", { name: "Perbandingan November" })).toHaveAttribute("href", "/reports/comparisons/r-2");
    expect(within(row).getByText("Versi 2")).toBeInTheDocument();
    // AC10: the names come frozen from the server under the PBI-15 rule (real name or code).
    expect(within(row).getByText("AiYU, Produk B")).toBeInTheDocument();
    expect(within(row).getByText("18 Nov 2026")).toBeInTheDocument();
  });

  // AC9: replaced versions are kept and still readable from the comparison report list.
  it("tells where older versions can still be read", async () => {
    render(<PublishedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([item()]))} />);

    await screen.findByRole("table");
    expect(screen.getByText(/Versi lama yang sudah diganti tetap tersimpan/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Laporan perbandingan" })).toHaveAttribute("href", "/reports/comparisons");
  });

  // AC9: no public link, no sharing outside the platform.
  it("only links inside the app", async () => {
    render(<PublishedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([item(), item({ id: "pub-3", report_id: "r-3", title: "Lain" })]))} />);

    await screen.findByRole("table");
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).toMatch(/^\//);
    expect(screen.queryByRole("button", { name: /salin|bagikan/i })).not.toBeInTheDocument();
  });

  it("explains an empty list", async () => {
    render(<PublishedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([]))} />);

    expect(await screen.findByText("Belum ada laporan terbit")).toBeInTheDocument();
  });

  it("offers a retry when the list fails", async () => {
    const listPublished = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([item()]);
    render(<PublishedReportList gateway={gatewayWith(listPublished)} />);

    expect(await screen.findByText("Gagal memuat daftar laporan terbit. Coba lagi.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
