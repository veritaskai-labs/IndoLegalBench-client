import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { httpDrilldownGateway } from "@/lib/reports/drilldownApi";
import { resultCases } from "@/test/reportFixtures";

import ResultCasesPage from "./page";

// useParams hands over the segments still encoded; the page decodes them once (routeParams).
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "r%2D1", resultId: "res-1" }) }));
vi.mock("@/lib/reports/drilldownApi", () => ({
  httpDrilldownGateway: { cases: vi.fn(), caseDetail: vi.fn(), evidence: vi.fn(), evidenceFile: vi.fn() },
}));

describe("ResultCasesPage (PBI-16 AC1)", () => {
  it("asks for the cases of the number in the URL", async () => {
    vi.mocked(httpDrilldownGateway.cases).mockResolvedValue(resultCases());

    render(<ResultCasesPage />);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(httpDrilldownGateway.cases).toHaveBeenCalledWith("r-1", "res-1");
  });
});
