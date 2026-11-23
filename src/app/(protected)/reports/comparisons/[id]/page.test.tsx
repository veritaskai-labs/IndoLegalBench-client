import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { httpPublicationGateway } from "@/lib/reports/publicationApi";
import { httpReportsGateway } from "@/lib/reports/reportsApi";
import { session } from "@/test/authMock";
import { devTestReport, firstReport } from "@/test/reportFixtures";

import ComparisonReportPage from "./page";

// The page reads the id from the URL; useParams hands it over still encoded.
const params = vi.hoisted(() => ({ id: "r-1" }));
vi.mock("next/navigation", () => ({ useParams: () => params }));

// reportsApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/reports/reportsApi", () => ({
  httpReportsGateway: { list: vi.fn(), detail: vi.fn(), pdf: vi.fn() },
}));

// SCRUM-335: the Terbitkan section reads the role; null keeps the session loading, as before.
vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));
vi.mock("@/lib/reports/publicationApi", () => ({
  httpPublicationGateway: { publish: vi.fn(), listPublished: vi.fn() },
}));

const detail = vi.mocked(httpReportsGateway.detail);
const publish = vi.mocked(httpPublicationGateway.publish);

beforeEach(() => {
  params.id = "r-1";
  session.role = null;
  detail.mockReset();
  publish.mockReset();
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

  it("shows the report body, its status and the PDF actions once loaded", async () => {
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
    expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeInTheDocument();
  });

  // SCRUM-364 (AC10): the "Bahasa laporan" chip is gone, because the detail no longer carries the language.
  // The page chrome stays Indonesian and the body is English, like the PDF of every report from the builder (K3).
  it("shows no language chip and keeps the chrome Indonesian around an English body", async () => {
    detail.mockResolvedValue(devTestReport());

    render(<ComparisonReportPage />);

    expect(await screen.findByRole("article")).toHaveAttribute("lang", "en");
    expect(screen.queryByText(/Bahasa laporan/)).toBeNull();
    expect(screen.getByText("Tersimpan")).toBeInTheDocument();
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

  // PBI-16 AC1 (SCRUM-328): the scores of a reopened report open the cases behind them.
  it("links the scores to the drill-down of this report", async () => {
    const report = firstReport();
    detail.mockResolvedValue(report);

    render(<ComparisonReportPage />);

    await screen.findByRole("article");
    const [first] = screen.getAllByRole("link", { name: /telusuri kasus di balik skor deterministik/ });
    expect(first.getAttribute("href")).toMatch(new RegExp(`^/reports/comparisons/${report.id}/results/result-\\d+$`));
  });
});

// SCRUM-335 (PBI-17 AC9, AC12): publishing from the report page.
describe("ComparisonReportPage publishing", () => {
  it("lets Admin publish a saved Test report and reloads it as published", async () => {
    session.role = "admin";
    detail.mockResolvedValueOnce(firstReport()).mockResolvedValueOnce(firstReport({ status: "published" }));
    publish.mockResolvedValue({ id: "pub-1", report_id: "r-1", version_no: 1, supersedes_id: null });

    render(<ComparisonReportPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Terbitkan" }));
    const dialog = within(screen.getByRole("dialog", { name: "Terbitkan laporan?" }));
    await userEvent.click(dialog.getByRole("button", { name: "Terbitkan" }));

    expect(publish).toHaveBeenCalledWith(firstReport().id, undefined);
    expect(await screen.findByText("Terbit")).toBeInTheDocument();
    expect(detail).toHaveBeenCalledTimes(2);
    // Review #106 blocker: the new version number survives the reload.
    const message = await screen.findByText("Laporan diterbitkan sebagai Versi 1.");
    expect(message.tagName).toBe("OUTPUT");
  });

  it("after Ganti versi names the new version and links to the replacing report", async () => {
    session.role = "admin";
    const published = firstReport({ status: "published" });
    detail.mockResolvedValueOnce(published).mockResolvedValueOnce(firstReport({ status: "superseded" }));
    vi.mocked(httpPublicationGateway.listPublished).mockResolvedValue([
      {
        id: "pub-1",
        report_id: published.id,
        version_no: 1,
        title: published.title,
        published_at: "2026-11-18T03:00:00Z",
        published_by: "admin-1",
        product_labels: [],
      },
    ]);
    vi.mocked(httpReportsGateway.list).mockResolvedValue([firstReport({ id: "r-new", title: "November" })]);
    publish.mockResolvedValue({ id: "pub-2", report_id: "r-new", version_no: 2, supersedes_id: "pub-1" });

    render(<ComparisonReportPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Ganti versi" }));
    const dialog = within(screen.getByRole("dialog", { name: "Ganti versi laporan?" }));
    await userEvent.selectOptions(await dialog.findByRole("combobox", { name: "Laporan pengganti" }), "r-new");
    await userEvent.click(dialog.getByRole("button", { name: "Ganti versi" }));

    expect(await screen.findByText(/sudah digantikan versi yang lebih baru/)).toBeInTheDocument();
    expect(screen.getByText(/Laporan pengganti diterbitkan sebagai Versi 2\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka versi baru" })).toHaveAttribute("href", "/reports/comparisons/r-new");
  });

  it("keeps Terbitkan off for a Dev + Test report and says why", async () => {
    session.role = "admin";
    detail.mockResolvedValue(devTestReport());

    render(<ComparisonReportPage />);

    expect(await screen.findByRole("button", { name: "Terbitkan" })).toBeDisabled();
    expect(screen.getByText(/memuat skor dev, jadi tidak bisa diterbitkan/)).toBeInTheDocument();
  });

  it("shows no Terbitkan to a Viewer", async () => {
    session.role = "viewer";
    detail.mockResolvedValue(firstReport());

    render(<ComparisonReportPage />);

    await screen.findByRole("article");
    expect(screen.queryByRole("button", { name: "Terbitkan" })).toBeNull();
  });

  it("marks a replaced version for every role", async () => {
    session.role = "viewer";
    detail.mockResolvedValue(firstReport({ status: "superseded" }));

    render(<ComparisonReportPage />);

    expect(await screen.findByText(/sudah digantikan versi yang lebih baru/)).toBeInTheDocument();
  });
});

// SCRUM-367 (PBI-15 AC9): Admin traces a code back to the real product. The server decides who gets the mapping
// (null for every other role), so the page shows the panel exactly when the report carries one.
describe("ComparisonReportPage product mapping", () => {
  const codeReport = () =>
    firstReport({
      product_label_mode: "code",
      product_mapping: [
        { label: "Product A", real_name: "AiYU" },
        { label: "Product B", real_name: "Gemini" },
      ],
    });

  it("shows the mapping panel for a code report that carries one, outside the report body", async () => {
    session.role = "admin";
    detail.mockResolvedValue(codeReport());

    render(<ComparisonReportPage />);

    const article = await screen.findByRole("article");
    const table = screen.getByRole("table", { name: "Pemetaan kode produk" });
    expect(within(table).getByText("AiYU")).toBeInTheDocument();
    expect(within(table).getByText("Gemini")).toBeInTheDocument();
    // Outside ReportDocument, so the real names are not part of the report body that the PDF mirrors.
    expect(article).not.toContainElement(table);
  });

  it("shows no panel when the server sent no mapping, as for every other role", async () => {
    session.role = "viewer";
    detail.mockResolvedValue(firstReport({ product_label_mode: "code", product_mapping: null }));

    render(<ComparisonReportPage />);

    await screen.findByRole("article");
    expect(screen.queryByRole("table", { name: "Pemetaan kode produk" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Pemetaan kode produk" })).toBeNull();
  });

  it("shows no panel for a real-name report", async () => {
    session.role = "admin";
    detail.mockResolvedValue(firstReport());

    render(<ComparisonReportPage />);

    await screen.findByRole("article");
    expect(screen.queryByRole("heading", { name: "Pemetaan kode produk" })).toBeNull();
  });
});
