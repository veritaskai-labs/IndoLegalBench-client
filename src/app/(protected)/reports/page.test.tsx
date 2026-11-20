import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpGradingGateway } from "@/lib/grading/gradingApi";
import { gradedRunItem } from "@/test/gradingFixtures";
import type { Role } from "@/types";
import ReportsPage from "./page";

const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

// gradingApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/grading/gradingApi", () => ({
  httpGradingGateway: { results: vi.fn(), sessions: vi.fn(), enqueue: vi.fn(), progress: vi.fn(), runs: vi.fn(), run: vi.fn(), estimate: vi.fn() },
}));

const sessionsRead = vi.mocked(httpGradingGateway.sessions);

function signedInAs(role: Role) {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { id: "u-1", name: "Uji", email: "u@veritask.test", role },
  });
}

beforeEach(() => {
  sessionsRead.mockReset();
  sessionsRead.mockResolvedValue([gradedRunItem({ session_id: "s-1" })]);
});

describe("ReportsPage (PBI-14 AC8, PO decision: Viewer reads results under Laporan)", () => {
  it.each<Role>(["viewer", "admin", "contributor"])("lists the graded sessions for %s", async (role) => {
    signedInAs(role);

    render(<ReportsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Laporan" })).toBeInTheDocument();
    const section = screen.getByRole("region", { name: "Hasil penilaian sesi" });
    expect(await within(section).findByRole("link", { name: "Uji Coba Produk A" })).toHaveAttribute(
      "href",
      "/reports/sessions/s-1/runs/run-1",
    );
    expect(sessionsRead).toHaveBeenCalledTimes(1);
  });

  // SCRUM-322: Laporan is the menu entry to the saved comparison reports; without this link they open by URL only.
  it.each<Role>(["viewer", "admin", "contributor"])("links %s to the saved comparison reports", (role) => {
    signedInAs(role);

    render(<ReportsPage />);

    const section = screen.getByRole("region", { name: "Laporan perbandingan" });
    expect(within(section).getByRole("link", { name: "Buka laporan perbandingan" })).toHaveAttribute(
      "href",
      "/reports/comparisons",
    );
  });

  // Developer AI has no Laporan list: the server refuses it (403), so the page keeps the placeholder
  // and never asks for it. Its comparison-report menu waits for an SA decision.
  it("keeps the placeholder for Developer AI and does not ask for the list", () => {
    signedInAs("developer_ai");

    render(<ReportsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Halaman Laporan" })).toBeInTheDocument();
    expect(
      screen.getByText("Fitur laporan perbandingan belum tersedia dan akan hadir pada sprint berikutnya."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Hasil penilaian sesi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buka laporan perbandingan" })).not.toBeInTheDocument();
    expect(sessionsRead).not.toHaveBeenCalled();
  });

  // Edge: the session ended while the page was open; AuthGuard redirects, and the list is never asked for.
  it("asks for nothing once the session has ended", () => {
    useAuthMock.mockReturnValue({ status: "unauthenticated", reason: "expired" });

    render(<ReportsPage />);

    expect(screen.queryByRole("region", { name: "Hasil penilaian sesi" })).not.toBeInTheDocument();
    expect(sessionsRead).not.toHaveBeenCalled();
  });

  // Until the role is known, neither the placeholder nor the list flashes on screen.
  it("waits for the role before showing anything or asking for the list", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    render(<ReportsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Memuat…");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(sessionsRead).not.toHaveBeenCalled();
  });
});
