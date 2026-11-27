import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buttonClasses } from "@/components/ui/Button";
import { forgetDrilldownMemory, useResultCases } from "@/hooks/useReportDrilldown";
import { ApiError } from "@/lib/apiClient";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import type { SortState } from "@/lib/ui/tableModel";
import { caseScore, resultCases } from "@/test/reportFixtures";

import { CaseNavigation } from "./CaseNavigation";

afterEach(forgetDrilldownMemory);

/** Five cases behind res-1; ILB-002 is closed for this role (AC3), so four can be opened. */
const FIVE = resultCases({
  cases: [
    caseScore({ case_id: "c-1", case_code: "ILB-001", llm_score: "0.50" }),
    caseScore({ case_id: "c-2", case_code: "ILB-002", llm_score: "0.95", content_visible: false }),
    caseScore({ case_id: "c-3", case_code: "ILB-003", llm_score: "0.90" }),
    caseScore({ case_id: "c-4", case_code: "ILB-004", llm_score: "0.70" }),
    caseScore({ case_id: "c-5", case_code: "ILB-005", llm_score: "0.10" }),
  ],
});

function fakeGateway(cases: DrilldownGateway["cases"] = vi.fn().mockResolvedValue(FIVE)): DrilldownGateway {
  return { cases, caseDetail: vi.fn(), evidence: vi.fn(), evidenceFile: vi.fn() };
}

function renderNavigation(caseId: string, gateway = fakeGateway(), sort: SortState | null = null) {
  render(<CaseNavigation reportId="r-1" resultId="res-1" caseId={caseId} sort={sort} gateway={gateway} />);
  return gateway;
}

const CASE_PAGE = "/reports/comparisons/r-1/results/res-1/cases";

/** Lets the case list request settle, so "shows nothing" is checked after the answer, not while it loads. */
async function settle() {
  await act(async () => {});
}

/** Loads the case list once, like the case list page does before a case is opened. */
function ListPage({ gateway }: Readonly<{ gateway: DrilldownGateway }>) {
  const cases = useResultCases("r-1", "res-1", gateway);
  return <p>{cases.status}</p>;
}

// SCRUM-378 (A2 of SCRUM-346, approved by the PO): from a case, go straight to the next one.
describe("CaseNavigation", () => {
  // Positif: both directions, with the code of the case they lead to and the position in the list.
  it("links to the previous and next case of the same number and says where the user is", async () => {
    renderNavigation("c-3");

    const nav = await screen.findByRole("navigation", { name: "Kasus lain di angka ini" });
    expect(within(nav).getByText("Kasus 2 dari 4")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Kasus sebelumnya ILB-001" })).toHaveAttribute("href", `${CASE_PAGE}/c-1`);
    expect(within(nav).getByRole("link", { name: "Kasus berikutnya ILB-004" })).toHaveAttribute("href", `${CASE_PAGE}/c-4`);
  });

  // Positif: a closed case cannot be opened (AC3), so the step goes past it.
  it("skips a closed case", async () => {
    renderNavigation("c-1");

    expect(await screen.findByRole("link", { name: "Kasus berikutnya ILB-003" })).toHaveAttribute("href", `${CASE_PAGE}/c-3`);
  });

  // Positif: the order of a sorted list, and the links keep that sort for the next step and the way back.
  it("follows the sort of the list it came from", async () => {
    renderNavigation("c-3", fakeGateway(), { key: "llm_score", direction: "desc" });

    const nav = await screen.findByRole("navigation", { name: "Kasus lain di angka ini" });
    expect(within(nav).getByText("Kasus 1 dari 4")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Kasus berikutnya ILB-004" })).toHaveAttribute(
      "href",
      `${CASE_PAGE}/c-4?urut=llm_score-desc`,
    );
  });

  // Edge: the first case has no previous case, and the step stays visible but off.
  it("turns Kasus sebelumnya off on the first case", async () => {
    renderNavigation("c-1");

    const nav = await screen.findByRole("navigation", { name: "Kasus lain di angka ini" });
    // Review #135 and Sonar: no fake link. The dimmed step is only visual; screen readers hear the position and
    // the one link that exists.
    expect(within(nav).queryByRole("link", { name: /Kasus sebelumnya/ })).not.toBeInTheDocument();
    expect(within(nav).getByText("Kasus sebelumnya")).toHaveAttribute("aria-hidden", "true");
    expect(within(nav).getByText("Kasus 1 dari 4")).toBeInTheDocument();
  });

  // Edge: the last case has no next case.
  it("turns Kasus berikutnya off on the last case", async () => {
    renderNavigation("c-5");

    const nav = await screen.findByRole("navigation", { name: "Kasus lain di angka ini" });
    expect(within(nav).queryByRole("link", { name: /Kasus berikutnya/ })).not.toBeInTheDocument();
    expect(within(nav).getByText("Kasus berikutnya")).toHaveAttribute("aria-hidden", "true");
    expect(within(nav).getByRole("link", { name: "Kasus sebelumnya ILB-004" })).toBeInTheDocument();
  });

  // Edge: a number with one openable case has nowhere to go, so there is no navigation at all.
  it("shows nothing for a single case", async () => {
    const gateway = renderNavigation("c-1", fakeGateway(vi.fn().mockResolvedValue(resultCases())));
    await settle();

    expect(gateway.cases).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // Negatif: a case that is not among the openable cases of this number has no place in the list.
  it("shows nothing for a case outside the list", async () => {
    const gateway = renderNavigation("c-404");
    await settle();

    expect(gateway.cases).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // Edge: nothing flickers in while the list loads.
  it("shows nothing while the list loads", () => {
    renderNavigation("c-3", fakeGateway(vi.fn().mockReturnValue(new Promise(() => {}))));

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // Negatif: a passing failure says so next to the case and loads again on Coba lagi.
  it("offers a retry when the list fails to load", async () => {
    const user = userEvent.setup();
    const cases = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(FIVE);
    renderNavigation("c-3", fakeGateway(cases));

    expect(await screen.findByText(/Kasus sebelumnya dan berikutnya gagal dimuat/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByRole("navigation", { name: "Kasus lain di angka ini" })).toBeInTheDocument();
    expect(cases).toHaveBeenCalledTimes(2);
  });

  // Negatif: a list the user may not read (403, 404) is not explained here; the case itself already says so.
  it("shows nothing when the list is hidden from this role", async () => {
    const cases = vi.fn().mockRejectedValue(new ApiError(404, "RESULT_NOT_FOUND"));
    renderNavigation("c-3", fakeGateway(cases));
    await settle();

    expect(cases).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/gagal dimuat/)).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // Positif (Jira: "tidak menambah request bila bisa"): coming from the case list, its list is reused.
  it("reuses the list the case list page loaded, without another request", async () => {
    const gateway = fakeGateway();
    const list = render(<ListPage gateway={gateway} />);
    expect(await screen.findByText("ready")).toBeInTheDocument();
    list.unmount();

    renderNavigation("c-3", gateway);

    expect(await screen.findByRole("navigation", { name: "Kasus lain di angka ini" })).toBeInTheDocument();
    expect(gateway.cases).toHaveBeenCalledTimes(1);
  });

  // Edge, review #135: case codes can be 64 characters without spaces. At 375 px each link is half the screen, so
  // the code must be allowed to break anywhere, or the two links overlap (measured in Chrome: 0 px overlap after).
  it("lets a long case code wrap inside its link instead of pushing the other link", async () => {
    const long = "X".repeat(64);
    const gateway = fakeGateway(
      vi.fn().mockResolvedValue(resultCases({ cases: [caseScore({ case_id: "c-1" }), caseScore({ case_id: "c-2", case_code: long })] })),
    );
    renderNavigation("c-1", gateway);

    const link = await screen.findByRole("link", { name: `Kasus berikutnya ${long}` });

    expect(within(link).getByText(long)).toHaveClass("[overflow-wrap:anywhere]", "min-w-0");
  });

  // Review #135 (PBI-25 one look): the steps look like the shared Button ghost, and a dimmed step like the turned-off
  // Pager button the user just saw on the case list.
  it("uses the shared Button look for the steps and their turned-off state", async () => {
    renderNavigation("c-1");

    const nav = await screen.findByRole("navigation", { name: "Kasus lain di angka ini" });
    const next = within(nav).getByRole("link", { name: "Kasus berikutnya ILB-003" });
    expect(next).toHaveClass(...buttonClasses({ variant: "ghost", multiline: true }).split(" "));
    expect(within(nav).getByText("Kasus sebelumnya")).toHaveClass(
      ...buttonClasses({ variant: "ghost", multiline: true, disabled: true }).split(" "),
    );
  });
});
