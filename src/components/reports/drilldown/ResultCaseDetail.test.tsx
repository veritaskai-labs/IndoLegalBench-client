import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import { HIDDEN_DRILLDOWN } from "@/lib/reports/drilldownRules";
import { caseDetail, reportAttempt } from "@/test/reportFixtures";

import { ResultCaseDetail } from "./ResultCaseDetail";

// The role decides whether manual-answer evidence is shown (AC4); useAuth has its own tests.
const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

function signInAs(role: string) {
  useAuthMock.mockReturnValue({ status: "authenticated", user: { role } });
}

beforeEach(() => {
  useAuthMock.mockReturnValue({ status: "loading" });
});

function renderDetail(caseDetailLoader: DrilldownGateway["caseDetail"]) {
  const gateway: DrilldownGateway = {
    cases: vi.fn(),
    caseDetail: caseDetailLoader,
    evidence: vi.fn().mockResolvedValue([]),
    evidenceFile: vi.fn(),
  };
  render(<ResultCaseDetail reportId="r-1" resultId="res-1" caseId="c-1" gateway={gateway} />);
  return gateway;
}

function attempt(name: string) {
  return screen.getByRole("article", { name });
}

// SCRUM-328 (PBI-16 AC2, AC3; D6 steps 4–7): one case opened down to the original answer of each attempt.
describe("ResultCaseDetail", () => {
  it("sits under the case list it came from and waits for the case", () => {
    renderDetail(vi.fn().mockReturnValue(new Promise(() => {})));

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Kasus di balik angka" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Memuat kasus…");
  });

  // Positive: case content, rubric version and case scores sit above the attempts (AC2).
  it("shows the case content, its version and the rubric version", async () => {
    renderDetail(vi.fn().mockResolvedValue(caseDetail()));

    expect(await screen.findByRole("heading", { level: 1, name: "ILB-001 v2: PHK sepihak" })).toBeInTheDocument();
    expect(screen.getByText("AiYU · Otomatis · Kasus test · Rubrik v3 · Ketenagakerjaan")).toBeInTheDocument();
    expect(screen.getByText("Apakah PHK sepihak sah?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Percobaan (2)" })).toBeInTheDocument();
  });

  // Positive: the original answer renders as markdown, with its scores, explanation and reasons (AC2).
  it("renders the original answer as markdown with its scores and reasons", async () => {
    renderDetail(
      vi.fn().mockResolvedValue(caseDetail({ attempts: [reportAttempt({ reasons: ["article_not_cited", "NEW_CODE"] })] })),
    );

    const card = await screen.findByRole("article", { name: "Percobaan 1" });
    expect(within(card).getByText("Pasal 151", { selector: "strong" })).toBeInTheDocument();
    expect(within(card).getByText("0,80")).toBeInTheDocument();
    expect(within(card).getByText(/Pasal yang dikutip tepat\./)).toBeInTheDocument();
    expect(within(card).getByText(/Pasal tidak disebut, NEW_CODE/)).toBeInTheDocument();
    expect(within(card).getByText("Otomatis")).toBeInTheDocument();
  });

  // Edge: a technical failure has no score and says "Tidak dinilai", never 0 (AC2).
  it("marks a technical failure as not graded without scores", async () => {
    renderDetail(vi.fn().mockResolvedValue(caseDetail()));

    await screen.findByRole("article", { name: "Percobaan 2" });
    const failed = attempt("Percobaan 2");
    expect(within(failed).getByText("Tidak dinilai")).toBeInTheDocument();
    expect(within(failed).queryByText("Skor deterministik:")).not.toBeInTheDocument();
    expect(within(failed).getByText("Tidak ada jawaban.")).toBeInTheDocument();
  });

  // Positive: a manual answer carries its label, who filled it and when it was obtained (AC2).
  it("shows the manual label, filler and answer date", async () => {
    renderDetail(
      vi.fn().mockResolvedValue(
        caseDetail({
          measurement_kind: "manual",
          attempts: [
            reportAttempt({ source: "manual", filled_by_name: "Kontributor Satu", answered_at: "2026-11-20T03:00:00Z" }),
          ],
        }),
      ),
    );

    const card = await screen.findByRole("article", { name: "Percobaan 1" });
    expect(within(card).getByText("Manual")).toBeInTheDocument();
    expect(within(card).getByText("Kontributor Satu")).toBeInTheDocument();
    expect(within(card).getByText("20 Nov 2026")).toBeInTheDocument();
  });

  // Edge: a deleted filler account or a missing date reads as a dash.
  it("shows a dash for a manual answer without filler or date", async () => {
    renderDetail(vi.fn().mockResolvedValue(caseDetail({ attempts: [reportAttempt({ source: "manual" })] })));

    const card = await screen.findByRole("article", { name: "Percobaan 1" });
    expect(within(card).getAllByText("–")).toHaveLength(2);
  });

  // Negative: a role without content rights gets the server's message with the contact email, and no retry (AC3).
  it("explains forbidden content with the contact email and offers no retry", async () => {
    const message = "Isi kasus dan jawaban asli tidak dapat dibuka dengan peran Anda. Untuk mendapatkan isi kasus, kirim email ke indolegalbench@veritask.ai.";
    renderDetail(vi.fn().mockRejectedValue(new ApiError(403, "CASE_CONTENT_FORBIDDEN", message)));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Isi kasus" })).not.toBeInTheDocument();
  });

  // Negative: a case outside this number reads like a missing one (D9).
  it("hides a case that is not behind this number", async () => {
    renderDetail(vi.fn().mockRejectedValue(new ApiError(404, "REPORT_CASE_NOT_FOUND")));

    expect(await screen.findByText(HIDDEN_DRILLDOWN)).toBeInTheDocument();
  });

  it("offers a retry when the server fails", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new ApiError(500, "ANY")).mockResolvedValueOnce(caseDetail());
    renderDetail(loader);

    (await screen.findByRole("button", { name: "Coba lagi" })).click();

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("ILB-001");
  });

  // Edge: a case without a question or category still renders.
  it("shows a dash for a case without question or category", async () => {
    renderDetail(vi.fn().mockResolvedValue(caseDetail({ question: null, category: null, attempts: [] })));

    expect(await screen.findByText("AiYU · Otomatis · Kasus test · Rubrik v3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Isi kasus" }).nextElementSibling).toHaveTextContent("–");
  });

  // Positive: Admin and Kontributor see the evidence of manual answers only (AC4).
  it.each(["admin", "contributor"])("shows %s the evidence of a manual answer", async (role) => {
    signInAs(role);
    const gateway = renderDetail(
      vi.fn().mockResolvedValue(
        caseDetail({ attempts: [reportAttempt({ source: "manual", repetition_no: 3 }), reportAttempt({ attempt_id: "a-9" })] }),
      ),
    );

    expect(await screen.findByRole("region", { name: "Bukti percobaan 3" })).toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: /^Bukti percobaan/ })).toHaveLength(1);
    expect(gateway.evidence).toHaveBeenCalledWith("r-1", "res-1", "c-1", 3);
  });

  // Negative: Developer AI (dev cases) never asks for evidence; the server would refuse it anyway (AC4).
  it("never asks for evidence as Developer AI", async () => {
    signInAs("developer_ai");
    const gateway = renderDetail(vi.fn().mockResolvedValue(caseDetail({ attempts: [reportAttempt({ source: "manual" })] })));

    await screen.findByRole("article", { name: "Percobaan 1" });
    expect(screen.queryByRole("region", { name: /^Bukti percobaan/ })).not.toBeInTheDocument();
    expect(gateway.evidence).not.toHaveBeenCalled();
  });
});
