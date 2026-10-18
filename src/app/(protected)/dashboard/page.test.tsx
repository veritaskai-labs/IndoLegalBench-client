import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardSummary } from "@/types/dashboard";
import DashboardPage from "./page";

const { useAuthMock, useDashboardMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useDashboardMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("@/hooks/useDashboard", () => ({ useDashboard: useDashboardMock }));

afterEach(() => {
  useAuthMock.mockReset();
  useDashboardMock.mockReset();
});

function authenticatedAs(name: string, role = "author") {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { name, email: "rina@veritask.test", role },
  });
}

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    generated_at: "2026-10-18T02:05:00Z",
    case_counts: { draft: 3, in_review: 2, needs_revision: 0, approved: 5 },
    total_cases: 10,
    waiting_for_review: 2,
    review_queue: null,
    needs_reassignment: null,
    latest_run: null,
    ...overrides,
  };
}

function ready(overrides: Partial<DashboardSummary> = {}) {
  useDashboardMock.mockReturnValue({
    status: "ready",
    summary: summary(overrides),
    reload: vi.fn(),
  });
}

const QUEUED = {
  assignment_id: "asg-1",
  case_id: "case-1",
  case_code: "ILB-001",
  title: "Sengketa tanah warisan",
  round_no: 1,
  waiting_since: "2026-10-15T02:00:00Z",
  assigned_at: "2026-10-15T02:00:00Z",
};

describe("DashboardPage", () => {
  it("greets the user by first name", () => {
    authenticatedAs("Rina Kusuma Dewi");
    useDashboardMock.mockReturnValue({ status: "loading", reload: vi.fn() });

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Selamat pagi, Rina");
  });

  it("uses the whole name when it is a single word", () => {
    authenticatedAs("Rina");
    useDashboardMock.mockReturnValue({ status: "loading", reload: vi.fn() });

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Selamat pagi, Rina");
  });

  it("shows the greeting without a name when the user is not authenticated yet", () => {
    useAuthMock.mockReturnValue({ status: "loading" });
    useDashboardMock.mockReturnValue({ status: "loading", reload: vi.fn() });

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Selamat pagi,$/);
  });

  // AC1
  it("shows the case counts once the summary arrives", () => {
    authenticatedAs("Rina");
    ready();

    render(<DashboardPage />);

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText(/10 kasus/)).toBeInTheDocument();
  });

  // AC2
  it("says when the numbers were last refreshed", () => {
    authenticatedAs("Rina");
    ready();

    render(<DashboardPage />);

    expect(screen.getByText("Diperbarui 09.05")).toBeInTheDocument();
  });

  // AC6
  it("shows the review queue for a reviewer", () => {
    authenticatedAs("Rina", "reviewer");
    ready({ review_queue: [QUEUED] });

    render(<DashboardPage />);

    const queue = screen.getByRole("link", { name: /ILB-001/ });

    expect(queue).toHaveAttribute("href", "/reviews/asg-1");
  });

  // Corner: peran lain tidak punya antrean, jadi bagiannya tidak muncul sama sekali.
  it("leaves the queue out for roles that do not review", () => {
    authenticatedAs("Rina");
    ready();

    render(<DashboardPage />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Corner: Viewer dijawab 403, jadi servernya tidak boleh dipanggil.
  it("does not ask for a dashboard a viewer may not see", () => {
    authenticatedAs("Rina", "viewer");
    useDashboardMock.mockReturnValue({ status: "loading", reload: vi.fn() });

    render(<DashboardPage />);

    expect(useDashboardMock).toHaveBeenCalledWith(false);
  });

  // Negative
  it("shows the problem instead of the numbers when the summary cannot be read", () => {
    authenticatedAs("Rina");
    useDashboardMock.mockReturnValue({
      status: "error",
      message: "Gagal memuat dasbor.",
      reload: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText("Gagal memuat dasbor.")).toBeInTheDocument();
    expect(screen.queryByText(/10 kasus/)).not.toBeInTheDocument();
  });
});