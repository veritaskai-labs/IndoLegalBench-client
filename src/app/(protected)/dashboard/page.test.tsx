import { render, screen } from "@testing-library/react";
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

function authenticatedAs(name: string, role = "contributor") {
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
    own_cases: null,
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
    
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
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
  it("shows the review queue for a contributor", () => {
    authenticatedAs("Rina", "contributor");
    ready({ review_queue: [QUEUED] });

    render(<DashboardPage />);

    const queue = screen.getByRole("link", { name: /ILB-001/ });

    expect(queue).toHaveAttribute("href", "/reviews/asg-1");
  });

  // PBI-24 AC6: writing work and the review queue are on one page for the contributor.
  it("shows the case counts and the review queue together for a contributor", () => {
    // Arrange
    authenticatedAs("Rina", "contributor");
    ready({ review_queue: [QUEUED] });

    // Act
    render(<DashboardPage />);

    // Assert
    expect(screen.getByRole("heading", { name: /ringkasan kasus/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /antrean review/i })).toBeInTheDocument();
    expect(screen.getByText("Total 10 kasus")).toBeInTheDocument();
  });

  // Empty: a contributor with nothing to review still sees the counts and a plain message.
  it("says nothing waits for the contributor when the queue is empty", () => {
    authenticatedAs("Rina", "contributor");
    ready({ review_queue: [] });

    render(<DashboardPage />);

    expect(screen.getByText("Tidak ada kasus yang menunggu review Anda.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ringkasan kasus/i })).toBeInTheDocument();
  });

  // Corner: the admin does not review, so the queue section does not appear at all.
  it("leaves the queue out when the server sends none", () => {
    authenticatedAs("Rina");
    ready({ review_queue: null });

    render(<DashboardPage />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Corner: Viewer is answered with a 403, the server can't be called.
  it("does not ask for a dashboard a viewer may not see", () => {
    authenticatedAs("Rina", "viewer");
    useDashboardMock.mockReturnValue({ status: "loading", reload: vi.fn() });

    render(<DashboardPage />);

    expect(useDashboardMock).toHaveBeenCalledWith(false);
  });

  // Corner: the server answers 403 to every role but contributor and admin, so asking would
  // only send the user to /forbidden.
  it("does not ask for a dashboard a developer AI may not see", () => {
    authenticatedAs("Rina", "developer_ai");
    useDashboardMock.mockReturnValue({ status: "loading", reload: vi.fn() });

    render(<DashboardPage />);

    expect(useDashboardMock).toHaveBeenCalledWith(false);
    expect(screen.getByText("Dasbor belum tersedia untuk peran Anda")).toBeInTheDocument();
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
  // AC1: number waiting for review should be displayed on the page, not just in the response.
  it("shows how many cases are waiting for a review", () => {
    authenticatedAs("Rina");
    ready({ waiting_for_review: 4 });

    render(<DashboardPage />);

    expect(screen.getAllByRole("listitem")[4]).toHaveTextContent("4");
  });

  // Review #35: admin can take a shortcut to cases that need a new reviewer.
  it("links the admin to the cases that need a new reviewer", () => {
    authenticatedAs("Rina");
    ready({ needs_reassignment: 3 });

    render(<DashboardPage />);

    expect(
      screen.getByRole("link", { name: /penugasan ulang/i }),
    ).toHaveAttribute("href", "/admin/reviews");
  });

  // Negative: viewer cannot access dashboard widgets and sees a role-specific empty state
  it("shows an empty state for a viewer and does not request dashboard data", () => {
    // Arrange
    authenticatedAs("Rina", "viewer");
    useDashboardMock.mockImplementation((allowed: boolean) =>
      allowed
        ? { status: "ready", summary: summary({ review_queue: [QUEUED] }), reload: vi.fn() }
        : { status: "loading", reload: vi.fn() },
    );

    // Act
    render(<DashboardPage />);

    // Assert
    expect(useDashboardMock).toHaveBeenCalledWith(false);
    expect(screen.getByText("Dasbor belum tersedia untuk peran Anda")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Akun Anda hanya membaca kasus, jadi belum ada ringkasan kerja yang bisa ditampilkan.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /ringkasan kasus/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /antrean review/i })).not.toBeInTheDocument();
  });

  // AC1: role isolation - Admin sees needs_reassignment without review queue
  it("shows needs_reassignment for admin without review queue", () => {
    // Arrange
    authenticatedAs("Admin", "admin");
    ready({ needs_reassignment: 2, review_queue: null });

    // Act
    render(<DashboardPage />);

    // Assert
    const adminLink = screen.getByRole("link", { name: /penugasan ulang/i });
    expect(adminLink).toHaveAttribute("href", "/admin/reviews");
    expect(screen.getByRole("region", { name: /perlu penugasan ulang/i })).toHaveTextContent("2");
    expect(screen.queryByRole("heading", { name: /antrean review/i })).not.toBeInTheDocument();
  });

  // AC1: role isolation - Contributor sees review queue without admin reassignment card
  it("shows review queue for contributor without admin reassignment card", () => {
    // Arrange
    authenticatedAs("Kontributor", "contributor");
    ready({ review_queue: [QUEUED], needs_reassignment: null });

    // Act
    render(<DashboardPage />);

    // Assert
    expect(screen.getByRole("heading", { name: /antrean review/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ILB-001/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /penugasan ulang/i })).not.toBeInTheDocument();
  });
});