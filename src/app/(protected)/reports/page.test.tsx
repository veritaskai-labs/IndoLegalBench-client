import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpGradingGateway } from "@/lib/grading/gradingApi";
import { gradedSessionItem } from "@/test/gradingFixtures";
import type { Role } from "@/types";
import ReportsPage from "./page";

const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

// gradingApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/grading/gradingApi", () => ({
  httpGradingGateway: { grade: vi.fn(), results: vi.fn(), sessions: vi.fn() },
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
  sessionsRead.mockResolvedValue([gradedSessionItem({ session_id: "s-1" })]);
});

describe("ReportsPage (PBI-14 AC8, PO decision: Viewer reads results under Laporan)", () => {
  it.each<Role>(["viewer", "admin"])("lists the graded sessions for %s", async (role) => {
    signedInAs(role);

    render(<ReportsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Laporan" })).toBeInTheDocument();
    const section = screen.getByRole("region", { name: "Hasil penilaian sesi" });
    expect(await within(section).findByRole("link", { name: "Uji Coba Produk A" })).toHaveAttribute(
      "href",
      "/reports/sessions/s-1",
    );
    expect(sessionsRead).toHaveBeenCalledTimes(1);
  });

  // Contributor still has the Laporan menu, but server#114 refuses the list (403), so the page keeps
  // the placeholder and never asks for it.
  it("keeps the placeholder for Contributor and does not ask for the list", () => {
    signedInAs("contributor");

    render(<ReportsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Halaman Laporan" })).toBeInTheDocument();
    expect(
      screen.getByText("Fitur laporan perbandingan belum tersedia dan akan hadir pada sprint berikutnya."),
    ).toBeInTheDocument();
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
