import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import type { ReportSummary } from "@/types/reports";

import { SavedReportList } from "./SavedReportList";

function summary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    id: "r-1",
    title: "Perbandingan 5 produk, Oktober 2026",
    score_scope: "test",
    has_dev_scores: false,
    status: "saved",
    products: ["AiYU", "DeepSeek"],
    created_by: "user-viewer",
    created_at: "2026-11-19T03:15:00Z",
    ...overrides,
  };
}

function gatewayWith(list: ReportsGateway["list"]): ReportsGateway {
  return { list, detail: vi.fn(), pdf: vi.fn(), eligibleSessions: vi.fn(), create: vi.fn(), validate: vi.fn() };
}

// SCRUM-322 (D3 step 10): every report is saved when it is made, and readers reopen it from this list. The
// server filters it: anyone but Admin only gets their own reports (D9). The list itself stays Indonesian (K3).
describe("SavedReportList", () => {
  it("sits under Laporan with its own heading", () => {
    render(<SavedReportList gateway={gatewayWith(vi.fn(() => new Promise<ReportSummary[]>(() => {})))} />);
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Laporan" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("heading", { level: 1, name: "Laporan perbandingan" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("explains an empty list", async () => {
    render(<SavedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([]))} />);
    expect(await screen.findByText("Belum ada laporan tersimpan")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("explains a failure and loads again on retry", async () => {
    const list = vi.fn().mockRejectedValueOnce(new ApiError(500, "ANY")).mockResolvedValueOnce([summary()]);
    render(<SavedReportList gateway={gatewayWith(list)} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat daftar laporan. Coba lagi.");
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByRole("link", { name: "Perbandingan 5 produk, Oktober 2026" })).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  // SCRUM-364 (AC9, AC10): the products compared sit next to the title, and the language column is gone,
  // because nothing in the app sets the language yet (PBI-26).
  it("Positif: shows each report with its products, scope, status and WIB date, without a language column", async () => {
    render(
      <SavedReportList
        gateway={gatewayWith(vi.fn().mockResolvedValue([summary({ score_scope: "dev_test", status: "published" })]))}
      />,
    );
    const link = await screen.findByRole("link", { name: "Perbandingan 5 produk, Oktober 2026" });
    const cells = within(link.closest("tr") as HTMLElement).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["AiYU, DeepSeek", "Dev + Test", "Terbit", "19 Nov 2026"]);
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Judul",
      "Produk",
      "Nilai",
      "Status",
      "Dibuat",
    ]);
  });

  // SCRUM-364: a long list is cut so the row stays one line, and the full list is one Tab away (tooltip).
  // Code labels are shown as the server froze them; the list never adds real names (only the detail does, Admin).
  it("Positif: cuts a long product list and keeps the full list as a tooltip", async () => {
    const codes = ["Product A", "Product B", "Product C", "Product D", "Product E"];
    render(<SavedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([summary({ products: codes })]))} />);

    const more = await screen.findByRole("button", { name: "+3 produk lain" });
    const row = more.closest("tr") as HTMLElement;
    expect(within(row).getByText("Product A, Product B")).toBeInTheDocument();
    expect(more).toHaveAccessibleDescription(codes.join(", "));
  });

  it("Edge: says when a report has no products", async () => {
    render(<SavedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([summary({ products: [] })]))} />);
    expect(await screen.findByText("Tidak ada produk")).toBeInTheDocument();
  });

  it("lists the newest report first", async () => {
    render(
      <SavedReportList
        gateway={gatewayWith(
          vi.fn().mockResolvedValue([
            summary({ id: "old", title: "September", created_at: "2026-10-02T03:00:00Z", status: "superseded" }),
            summary({ id: "new", title: "November", created_at: "2026-11-19T03:15:00Z" }),
          ]),
        )}
      />,
    );
    await screen.findByRole("table");
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["November", "September"]);
    expect(screen.getByText("Digantikan")).toBeInTheDocument();
  });

  // SCRUM-321: every role may make a report (server _create_roles), so the way in is shown to everyone, in every
  // state of the list. Edge: an empty list or a failed load is exactly when a reader looks for how to make one.
  it.each([
    ["loading", vi.fn(() => new Promise<ReportSummary[]>(() => {})), () => screen.findByRole("status")],
    ["empty", vi.fn().mockResolvedValue([]), () => screen.findByText("Belum ada laporan tersimpan")],
    ["failed", vi.fn().mockRejectedValue(new ApiError(500, "ANY")), () => screen.findByRole("alert")],
    ["filled", vi.fn().mockResolvedValue([summary()]), () => screen.findByRole("table")],
  ] as const)("links to the report builder when the list is %s", async (_state, list, inState) => {
    render(<SavedReportList gateway={gatewayWith(list)} />);
    // Wait until the list is really in that state, so the link is checked there and not only while loading.
    await inState();
    expect(screen.getByRole("link", { name: "Buat laporan" })).toHaveAttribute("href", "/reports/comparisons/new");
  });

  // The id travels in the URL, so it is encoded the same way the page decodes it.
  it("links each title to its report page", async () => {
    render(<SavedReportList gateway={gatewayWith(vi.fn().mockResolvedValue([summary({ id: "a b/c" })]))} />);
    expect(await screen.findByRole("link", { name: "Perbandingan 5 produk, Oktober 2026" })).toHaveAttribute(
      "href",
      "/reports/comparisons/a%20b%2Fc",
    );
  });
});
