import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { forgetResultCases } from "@/hooks/useReportDrilldown";
import { httpDrilldownGateway } from "@/lib/reports/drilldownApi";
import { caseDetail, caseScore, resultCases } from "@/test/reportFixtures";

import ResultCasePage from "./page";

// useParams hands over the segments still encoded; the page decodes them once (routeParams).
const search = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "r-1", resultId: "res-1", caseId: "c%2D1" }),
  useSearchParams: () => search.params,
  useRouter: () => ({ replace: search.replace }),
}));
vi.mock("@/lib/reports/drilldownApi", () => ({
  httpDrilldownGateway: { cases: vi.fn(), caseDetail: vi.fn(), evidence: vi.fn(), evidenceFile: vi.fn() },
}));

// Each test starts with no sort in the address and no remembered case list (SCRUM-378).
afterEach(() => {
  search.params = new URLSearchParams();
  search.replace.mockReset();
  forgetResultCases();
});

describe("ResultCasePage (PBI-16 AC2)", () => {
  it("asks for the case in the URL", async () => {
    vi.mocked(httpDrilldownGateway.caseDetail).mockResolvedValue(caseDetail());
    vi.mocked(httpDrilldownGateway.cases).mockResolvedValue(resultCases());

    render(<ResultCasePage />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("ILB-001");
    expect(httpDrilldownGateway.caseDetail).toHaveBeenCalledWith("r-1", "res-1", "c-1");
  });

  // Positif, SCRUM-378: the sort of the list it came from (?urut=) orders the navigation and travels on.
  it("steps through the cases in the order of the list it came from", async () => {
    search.params = new URLSearchParams("urut=llm_score-desc");
    vi.mocked(httpDrilldownGateway.caseDetail).mockResolvedValue(caseDetail());
    vi.mocked(httpDrilldownGateway.cases).mockResolvedValue(
      resultCases({
        cases: [
          caseScore({ case_id: "c-1", case_code: "ILB-001", llm_score: "0.50" }),
          caseScore({ case_id: "c-3", case_code: "ILB-003", llm_score: "0.90" }),
        ],
      }),
    );

    render(<ResultCasePage />);

    const nav = await screen.findByRole("navigation", { name: "Kasus lain di angka ini" });
    expect(within(nav).getByRole("link", { name: /Kasus sebelumnya/ })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1/cases/c-3?urut=llm_score-desc",
    );
    expect(screen.getByRole("link", { name: /Kembali ke daftar kasus/ })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1?urut=llm_score-desc",
    );
  });
});
