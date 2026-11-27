import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { forgetDrilldownMemory } from "@/hooks/useReportDrilldown";
import { httpDrilldownGateway } from "@/lib/reports/drilldownApi";
import { resultCases } from "@/test/reportFixtures";

import ResultCasesPage from "./page";

// useParams hands over the segments still encoded; the page decodes them once (routeParams).
const search = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "r%2D1", resultId: "res-1" }),
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
  forgetDrilldownMemory();
});

describe("ResultCasesPage (PBI-16 AC1)", () => {
  it("asks for the cases of the number in the URL", async () => {
    vi.mocked(httpDrilldownGateway.cases).mockResolvedValue(resultCases());

    render(<ResultCasesPage />);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(httpDrilldownGateway.cases).toHaveBeenCalledWith("r-1", "res-1");
  });

  // Positif, SCRUM-378: a sort picked on the list goes into the address without scrolling, so Back, a reload and
  // the case detail keep it.
  it("keeps the picked sort in the address", async () => {
    vi.mocked(httpDrilldownGateway.cases).mockResolvedValue(resultCases());
    render(<ResultCasesPage />);

    const header = await screen.findByRole("columnheader", { name: /Kode kasus/ });
    await userEvent.click(within(header).getByRole("button"));

    expect(search.replace).toHaveBeenCalledWith("/reports/comparisons/r-1/results/res-1?urut=case_code-asc", { scroll: false });
  });

  // Positif, SCRUM-378: coming back with ?urut= opens the list in that sort, and its links carry it on.
  it("opens in the sort from the address", async () => {
    search.params = new URLSearchParams("urut=case_code-desc");
    vi.mocked(httpDrilldownGateway.cases).mockResolvedValue(resultCases());

    render(<ResultCasesPage />);

    expect(await screen.findByRole("columnheader", { name: /Kode kasus/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("link", { name: /Buka jawaban/ })).toHaveAttribute(
      "href",
      "/reports/comparisons/r-1/results/res-1/cases/c-1?urut=case_code-desc",
    );
  });
});
