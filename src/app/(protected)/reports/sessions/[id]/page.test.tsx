import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { httpGradingGateway } from "@/lib/grading/gradingApi";
import { gradedAttempt, gradedCase, gradingResponse } from "@/test/gradingFixtures";
import SessionResultsReportPage from "./page";

// The page reads the id from the URL; useParams hands it over still encoded.
const params = vi.hoisted(() => ({ id: "s-1" }));
vi.mock("next/navigation", () => ({ useParams: () => params }));

// gradingApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/grading/gradingApi", () => ({ httpGradingGateway: { grade: vi.fn(), results: vi.fn() } }));

const resultsRead = vi.mocked(httpGradingGateway.results);

beforeEach(() => {
  params.id = "s-1";
  resultsRead.mockReset();
});

// PO decision: Viewer reads results under Laporan; Eksekusi stays Admin and Developer AI only.
describe("SessionResultsReportPage (PBI-14 AC8, Viewer under Laporan)", () => {
  it("sits under Laporan with its own heading", async () => {
    resultsRead.mockResolvedValue(gradingResponse());

    render(<SessionResultsReportPage />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Laporan" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("heading", { level: 1, name: "Hasil penilaian sesi" })).toBeInTheDocument();
  });

  it("asks for the session id from the URL, decoded once", async () => {
    params.id = "a%2Fb";
    resultsRead.mockResolvedValue(gradingResponse());

    render(<SessionResultsReportPage />);

    await screen.findByRole("table", { name: "Skor sesi" });
    expect(resultsRead).toHaveBeenCalledWith("a/b");
  });

  // Same tables as the session detail page, since both use the SCRUM-227 components.
  it("shows the rubric version, the three scores and the case table", async () => {
    resultsRead.mockResolvedValue(gradingResponse({ cases: [gradedCase({ case_code: "KC-001" })] }));

    render(<SessionResultsReportPage />);

    expect(await screen.findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Skor per kasus" })).toHaveTextContent("KC-001");
    expect(screen.getByText(/Versi rubrik v1/)).toBeInTheDocument();
  });

  // PO: Viewer sees scores and, on a row, the grading detail and rubric version. The question and the
  // AI's answer are out of scope (raw answers come with PBI-16 AC2), even though /results still carries them.
  it("never shows the question or the AI's answer, even with a case opened", async () => {
    const user = userEvent.setup();
    resultsRead.mockResolvedValue(
      gradingResponse({
        cases: [
          gradedCase({
            case_code: "KC-001",
            question: "Pertanyaan asli kasus",
            attempts: [gradedAttempt({ answer_text: "Jawaban AI asli" })],
          }),
        ],
      }),
    );

    render(<SessionResultsReportPage />);
    await user.click(await screen.findByRole("button", { name: /KC-001/ }));

    expect(screen.getByRole("region", { name: "Rincian KC-001" })).toHaveTextContent("Versi rubrik: v1");
    expect(document.body).not.toHaveTextContent("Pertanyaan asli kasus");
    expect(document.body).not.toHaveTextContent("Jawaban AI asli");
  });

  // Reading only: grading stays on the session detail page for Admin.
  it("offers no Nilai on a session that has not been graded", async () => {
    resultsRead.mockRejectedValue(new ApiError(404, "GRADING_NOT_FOUND"));

    render(<SessionResultsReportPage />);

    expect(await screen.findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  // server#114: the results of a session that has not ended are for Admin only.
  it("explains a refusal for a session that is still running", async () => {
    resultsRead.mockRejectedValue(new ApiError(403, "FORBIDDEN"));

    render(<SessionResultsReportPage />);

    expect(await screen.findByText("Hasil penilaian sesi yang masih berjalan hanya dapat dilihat Admin.")).toBeInTheDocument();
  });

  it("says when the session does not exist", async () => {
    resultsRead.mockRejectedValue(new ApiError(404, "MEASUREMENT_NOT_FOUND"));

    render(<SessionResultsReportPage />);

    expect(await screen.findByText("Sesi tidak ditemukan. Muat ulang halaman.")).toBeInTheDocument();
  });
});
