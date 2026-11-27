import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetResultCases } from "@/hooks/useReportDrilldown";
import { ApiError } from "@/lib/apiClient";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import { HIDDEN_DRILLDOWN } from "@/lib/reports/drilldownRules";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { caseDetail, caseScore, firstReport, otherProduct, reportAttempt, resultCases } from "@/test/reportFixtures";

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

// The case list behind "Kasus berikutnya" is remembered between pages (SCRUM-378); every test starts without it.
afterEach(forgetResultCases);

/** The report the case belongs to; by default it never answers, like a slow network. */
function fakeReports(detail: ReportsGateway["detail"] = vi.fn().mockReturnValue(new Promise(() => {}))): ReportsGateway {
  return { detail, list: vi.fn(), pdf: vi.fn(), eligibleSessions: vi.fn(), create: vi.fn(), validate: vi.fn() };
}

/** By default the case list for the navigation (SCRUM-378) never answers, so the older tests see no navigation. */
function renderDetail(
  caseDetailLoader: DrilldownGateway["caseDetail"],
  reports: ReportsGateway = fakeReports(),
  cases: DrilldownGateway["cases"] = vi.fn().mockReturnValue(new Promise(() => {})),
) {
  const gateway: DrilldownGateway = {
    cases,
    caseDetail: caseDetailLoader,
    evidence: vi.fn().mockResolvedValue([]),
    evidenceFile: vi.fn(),
  };
  render(
    <ResultCaseDetail reportId="r-1" resultId="res-1" caseId="c-1" gateway={gateway} reportsGateway={reports} />,
  );
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

    // The evidence loads in an effect after the region renders, so wait for its result, not only the region.
    const region = await screen.findByRole("region", { name: "Bukti percobaan 3" });
    expect(await within(region).findByText("Tidak ada bukti.")).toBeInTheDocument();
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

// SCRUM-372 (UAT feedback, SCRUM-370 API): the answers of another product in the same report, side by side.
describe("ResultCaseDetail product comparison", () => {
  const COMPARE = { name: "Bandingkan dengan produk lain" };
  const justisio = otherProduct({
    result_id: "res-3",
    product_label: "Justisio",
    measurement_kind: "automatic",
    status: "no_answer",
    rubric_version: null,
    det_score: null,
    llm_score: null,
    attempts: [],
  });

  async function openCase(role: string, others = [otherProduct()]) {
    signInAs(role);
    renderDetail(vi.fn().mockResolvedValue(caseDetail({ other_products: others })));
    await screen.findByRole("heading", { level: 1 });
  }

  it.each([
    ["admin", true],
    ["contributor", true],
    ["viewer", false],
    ["developer_ai", false],
  ])("offers the comparison to %s: %s", async (role, offered) => {
    await openCase(role);

    expect(screen.queryByRole("button", COMPARE) !== null).toBe(offered);
  });

  // Positive: with one other product the toggle puts both side by side right away, without a picker.
  it("puts the two products side by side and back", async () => {
    const user = userEvent.setup();
    await openCase("admin");

    await user.click(screen.getByRole("button", COMPARE));

    expect(screen.getByRole("button", COMPARE)).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "AiYU" })).getAllByRole("article")).toHaveLength(2);
    const other = screen.getByRole("region", { name: "LegalHero" });
    expect(within(other).getByText("Manual · Rubrik v3")).toBeInTheDocument();
    expect(within(other).getByText("Tanpa surat, PHK tidak sah.")).toBeInTheDocument();
    expect(within(other).getByText("Rina")).toBeInTheDocument();
    expect(within(other).getAllByText("1,00").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", COMPARE));

    expect(screen.queryByRole("region", { name: "LegalHero" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Percobaan (2)" })).toBeInTheDocument();
  });

  // Positive: with more than two products a picker chooses the product to compare with.
  it("lets the user pick the product when the report has more than two", async () => {
    const user = userEvent.setup();
    await openCase("contributor", [otherProduct(), justisio]);

    await user.click(screen.getByRole("button", COMPARE));
    const picker = screen.getByRole("combobox", { name: "Produk pembanding" });
    expect(screen.queryByRole("region", { name: "LegalHero" })).not.toBeInTheDocument();

    await user.selectOptions(picker, "Justisio");

    const other = screen.getByRole("region", { name: "Justisio" });
    expect(within(other).getByText("Tidak menjawab")).toBeInTheDocument();
    expect(within(other).getByText("Produk ini tidak menjawab kasus ini.")).toBeInTheDocument();
    expect(within(other).getByText("Otomatis · Rubrik –")).toBeInTheDocument();

    await user.selectOptions(picker, "LegalHero");

    expect(screen.getByRole("region", { name: "LegalHero" })).toBeInTheDocument();
  });

  // Edge: a product whose attempts all failed technically reads "Tidak dinilai", and a trial session says so.
  it("marks a not graded trial product", async () => {
    const user = userEvent.setup();
    const failed = reportAttempt({ attempt_id: "b-2", graded: false, det_score: null, llm_score: null, answer_text: null });
    await openCase("admin", [
      otherProduct({ status: "not_graded", is_trial: true, det_score: null, llm_score: null, attempts: [failed] }),
    ]);

    await user.click(screen.getByRole("button", COMPARE));

    const other = screen.getByRole("region", { name: "LegalHero" });
    expect(within(other).getByText("Uji Coba")).toBeInTheDocument();
    expect(within(other).getAllByText("Tidak dinilai")).toHaveLength(2);
    expect(within(other).queryByText("0,00")).not.toBeInTheDocument();
  });

  // Empty: nothing to compare with, so no toggle.
  it("says when there is no other product to compare with", async () => {
    await openCase("admin", []);

    expect(screen.getByText("Tidak ada produk lain di laporan ini untuk dibandingkan.")).toBeInTheDocument();
    expect(screen.queryByRole("button", COMPARE)).not.toBeInTheDocument();
  });

  // SCRUM-346 A2 (finding N4): the trail names the report the case was reached from, like the case list.
  it("names the report in the trail once it is loaded", async () => {
    renderDetail(
      vi.fn().mockResolvedValue(caseDetail()),
      fakeReports(vi.fn().mockResolvedValue(firstReport({ title: "Perbandingan November" }))),
    );

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(await within(breadcrumb).findByRole("link", { name: "Perbandingan November" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1",
    );
  });

  // SCRUM-346 A2 / AC3: a visible way back to the list of cases next to the title, not only the small trail.
  it("offers a way back to the case list next to the title", async () => {
    renderDetail(vi.fn().mockResolvedValue(caseDetail()));

    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByRole("link", { name: "Kembali ke daftar kasus" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1",
    );
  });

  // Positif, SCRUM-378: the navigation sits under the trail, and the way back keeps the sort of the list.
  it("offers the next case and a way back in the order of the list it came from", async () => {
    const sort = { key: "det_score", direction: "asc" } as const;
    const twoCases = resultCases({ cases: [caseScore(), caseScore({ case_id: "c-3", case_code: "ILB-003", det_score: "0.90" })] });
    const gateway: DrilldownGateway = {
      cases: vi.fn().mockResolvedValue(twoCases),
      caseDetail: vi.fn().mockResolvedValue(caseDetail()),
      evidence: vi.fn(),
      evidenceFile: vi.fn(),
    };
    render(<ResultCaseDetail reportId="r-1" resultId="res-1" caseId="c-1" sort={sort} gateway={gateway} reportsGateway={fakeReports()} />);

    const nav = await screen.findByRole("navigation", { name: "Kasus lain di angka ini" });
    expect(within(nav).getByRole("link", { name: "Kasus berikutnya ILB-003" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1/cases/c-3?urut=det_score-asc",
    );
    expect(await screen.findByRole("link", { name: "Kembali ke daftar kasus" })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1?urut=det_score-asc",
    );
  });

  // Edge, SCRUM-378: a case that fails to load still lets the user move on to the next one.
  it("keeps the navigation when the case itself fails", async () => {
    const twoCases = resultCases({ cases: [caseScore(), caseScore({ case_id: "c-3", case_code: "ILB-003" })] });
    renderDetail(vi.fn().mockRejectedValue(new ApiError(500, "ANY")), fakeReports(), vi.fn().mockResolvedValue(twoCases));

    expect(await screen.findByRole("link", { name: "Kasus berikutnya ILB-003" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });
});
