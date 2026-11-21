import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { httpDrilldownGateway } from "@/lib/reports/drilldownApi";
import { caseDetail } from "@/test/reportFixtures";

import ResultCasePage from "./page";

// useParams hands over the segments still encoded; the page decodes them once (routeParams).
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "r-1", resultId: "res-1", caseId: "c%2D1" }) }));
vi.mock("@/lib/reports/drilldownApi", () => ({
  httpDrilldownGateway: { cases: vi.fn(), caseDetail: vi.fn(), evidence: vi.fn(), evidenceFile: vi.fn() },
}));

describe("ResultCasePage (PBI-16 AC2)", () => {
  it("asks for the case in the URL", async () => {
    vi.mocked(httpDrilldownGateway.caseDetail).mockResolvedValue(caseDetail());

    render(<ResultCasePage />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("ILB-001");
    expect(httpDrilldownGateway.caseDetail).toHaveBeenCalledWith("r-1", "res-1", "c-1");
  });
});
