import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { httpReportsGateway } from "@/lib/reports/reportsApi";
import { devTestReport, firstReport } from "@/test/reportFixtures";

import ComparisonReportPage from "./page";

// The page reads the id from the URL; useParams hands it over still encoded.
const params = vi.hoisted(() => ({ id: "r-1" }));
vi.mock("next/navigation", () => ({ useParams: () => params }));

// reportsApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/reports/reportsApi", () => ({
  httpReportsGateway: { list: vi.fn(), detail: vi.fn(), pdf: vi.fn() },
}));

const detail = vi.mocked(httpReportsGateway.detail);

beforeEach(() => {
  params.id = "r-1";
  detail.mockReset();
});

// SCRUM-322 (D3 steps 10-15): reopen one saved report from its frozen results, with the PDF next to it.
describe("ComparisonReportPage", () => {
  it("sits under Laporan › Laporan perbandingan and waits for the report", () => {
    detail.mockReturnValue(new Promise(() => {}));

    render(<ComparisonReportPage />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Laporan" })).toHaveAttribute("href", "/reports");
    expect(within(breadcrumb).getByRole("link", { name: "Laporan perbandingan" })).toHaveAttribute(
      "href",
      "/reports/comparisons",
    );
    expect(within(breadcrumb).getByText("…")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1, name: "Laporan perbandingan" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Memuat laporan…");
  });

  it("shows the report body, its status, its language and the PDF actions once loaded", async () => {
    detail.mockResolvedValue(firstReport());

    render(<ComparisonReportPage />);

    const body = await screen.findByRole("article");
    expect(body).toHaveAttribute("lang", "en");
    expect(screen.getByRole("heading", { level: 1, name: "Perbandingan 5 produk, Oktober 2026" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Perbandingan 5 produk, Oktober 2026")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Tersimpan")).toBeInTheDocument();
    expect(screen.getByText("Bahasa laporan: EN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeInTheDocument();
  });

  // The page chrome stays Indonesian; only the report body follows the report's language (K3).
  it("keeps the page chrome Indonesian for an Indonesian Dev + Test report", async () => {
    detail.mockResolvedValue(devTestReport());

    render(<ComparisonReportPage />);

    expect(await screen.findByRole("article")).toHaveAttribute("lang", "id");
    expect(screen.getByText("Bahasa laporan: ID")).toBeInTheDocument();
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("asks for the report id from the URL, decoded once", async () => {
    params.id = "a%2Fb";
    detail.mockResolvedValue(firstReport());

    render(<ComparisonReportPage />);

    await screen.findByRole("article");
    expect(detail).toHaveBeenCalledWith("a/b");
  });

  // D9: someone else's saved report is hidden; the page does not say whether it exists, offers no PDF, and
  // offers no retry, because loading again cannot change the answer.
  it("explains a hidden or missing report without a PDF or a retry", async () => {
    detail.mockRejectedValueOnce(new ApiError(404, "ANY"));

    render(<ComparisonReportPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.",
    );
    expect(screen.queryByRole("button", { name: "Unduh PDF" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
  });

  it("loads the report again on retry after a server error", async () => {
    detail.mockRejectedValueOnce(new ApiError(500, "ANY")).mockResolvedValueOnce(firstReport());

    render(<ComparisonReportPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });
});
