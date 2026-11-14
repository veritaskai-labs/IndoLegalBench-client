import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { httpGradingGateway } from "@/lib/grading/gradingApi";
import { gradingResponse } from "@/test/gradingFixtures";
import ReportRunPage from "./page";

// The page reads both ids from the URL; useParams hands them over still encoded.
const params = vi.hoisted(() => ({ id: "s-1", runId: "run-1" }));
vi.mock("next/navigation", () => ({ useParams: () => params }));

// gradingApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/grading/gradingApi", () => ({ httpGradingGateway: { grade: vi.fn(), results: vi.fn(), run: vi.fn() } }));

const runRead = vi.mocked(httpGradingGateway.run);

beforeEach(() => {
  params.id = "s-1";
  params.runId = "run-1";
  runRead.mockReset();
});

describe("ReportRunPage (PBI-22 AC9, one run opened from Laporan)", () => {
  it("opens the clicked run and names its session, product, judge and rubric version", async () => {
    runRead.mockResolvedValue(
      gradingResponse({
        grading_run_id: "run-1",
        is_latest: false,
        session_label: "Uji Coba Produk A",
        product_name: "Produk Uji A",
        judge: { judge_provider_id: "j-1", name: "Judge Alfa", model_version: "alfa-2", cost_idr: null },
      }),
    );

    render(<ReportRunPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Uji Coba Produk A" })).toBeInTheDocument();
    expect(screen.getByText("Produk: Produk Uji A")).toBeInTheDocument();
    expect(screen.getByText("LLM judge: Judge Alfa · alfa-2")).toBeInTheDocument();
    expect(runRead).toHaveBeenCalledWith("s-1", "run-1");
  });

  it("sits under Laporan and links back to it", async () => {
    runRead.mockResolvedValue(gradingResponse({ session_label: "Uji Coba Produk A" }));

    render(<ReportRunPage />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Laporan" })).toHaveAttribute("href", "/reports");
    expect(await within(breadcrumb).findByText("Uji Coba Produk A")).toHaveAttribute("aria-current", "page");
  });

  it("decodes both ids from the URL before asking the server", async () => {
    params.id = "a%2Fb";
    params.runId = "x%23y";
    runRead.mockResolvedValue(gradingResponse());

    render(<ReportRunPage />);

    await screen.findByRole("heading", { level: 1 });
    expect(runRead).toHaveBeenCalledWith("a/b", "x#y");
  });

  // Edge: an old run without a judge still opens.
  it("omits the judge line for a run without a judge", async () => {
    runRead.mockResolvedValue(gradingResponse({ session_label: "Uji Coba Produk A", judge: null }));

    render(<ReportRunPage />);

    await screen.findByRole("heading", { level: 1, name: "Uji Coba Produk A" });
    expect(screen.queryByText(/LLM judge:/)).not.toBeInTheDocument();
  });

  it("explains a run that is not found and lets the user try again", async () => {
    const user = userEvent.setup();
    runRead.mockRejectedValueOnce(new ApiError(404, "GRADING_RUN_NOT_FOUND")).mockResolvedValueOnce(gradingResponse());

    render(<ReportRunPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Hasil penilaian ini tidak ditemukan. Muat ulang halaman.");
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(runRead).toHaveBeenCalledTimes(2);
  });

  it("keeps the general heading while the run loads", () => {
    runRead.mockReturnValue(new Promise(() => {}));

    render(<ReportRunPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Hasil penilaian" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Memuat…");
  });
});
