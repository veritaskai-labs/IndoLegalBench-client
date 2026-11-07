import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManualRunsPage from "./page";
import type { Role } from "@/types";
import type { SessionListItem } from "@/types/measurement";

const { useAuthMock, replaceMock, pushMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

const { useManualSessionsMock } = vi.hoisted(() => ({
  useManualSessionsMock: vi.fn(),
}));

vi.mock("@/hooks/useManualSessions", () => ({
  useManualSessions: useManualSessionsMock,
}));

function signedInAs(role: Role | null, status: "loading" | "authenticated" = "authenticated") {
  if (status === "loading" || role === null) {
    useAuthMock.mockReturnValue({ status: "loading" });
  } else {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: { id: "user-1", name: "User Test", email: "user@veritask.ai", role },
    });
  }
}

const MOCK_SESSIONS: SessionListItem[] = [
  {
    id: "m-1",
    label: "Sesi LegalHero Batch 1",
    created_at: "2026-11-05T00:00:00Z",
    created_by: "u-admin",
    created_by_name: "Admin User",
    product_id: "p-lh",
    product_name: "LegalHero",
    case_count: 50,
    repetitions: 1,
    status: "partially_filled",
    progress: { completed: 20, total: 50 },
  },
];

describe("ManualRunsPage (PBI-22 AC8, AC11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when authentication is loading", () => {
    signedInAs(null, "loading");
    useManualSessionsMock.mockReturnValue({ status: "loading" });

    render(<ManualRunsPage />);

    expect(screen.getByText("Memuat…")).toBeInTheDocument();
  });

  it("redirects unauthorized roles (developer_ai, viewer) to /forbidden", () => {
    signedInAs("developer_ai");
    useManualSessionsMock.mockReturnValue({ status: "ready", data: [] });

    render(<ManualRunsPage />);

    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
  });

  it("allows Contributor to view sessions, but hides 'Pengukuran Manual Baru' button", () => {
    signedInAs("contributor");
    useManualSessionsMock.mockReturnValue({
      status: "ready",
      data: MOCK_SESSIONS,
      reload: vi.fn(),
    });

    render(<ManualRunsPage />);

    expect(screen.getByRole("heading", { name: "Pengukuran Manual" })).toBeInTheDocument();
    expect(screen.getByText("Sesi LegalHero Batch 1")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pengukuran Manual Baru" })).not.toBeInTheDocument();
  });

  it("allows Admin to view sessions and shows 'Pengukuran Manual Baru' button", () => {
    signedInAs("admin");
    useManualSessionsMock.mockReturnValue({
      status: "ready",
      data: MOCK_SESSIONS,
      reload: vi.fn(),
    });

    render(<ManualRunsPage />);

    expect(screen.getByRole("heading", { name: "Pengukuran Manual" })).toBeInTheDocument();
    expect(screen.getByText("Sesi LegalHero Batch 1")).toBeInTheDocument();
    const createBtn = screen.getByRole("link", { name: "Pengukuran Manual Baru" });
    expect(createBtn).toBeInTheDocument();
    expect(createBtn).toHaveAttribute("href", "/manual-runs/new");
  });

  it("renders empty state when there are no manual sessions", () => {
    signedInAs("admin");
    useManualSessionsMock.mockReturnValue({
      status: "ready",
      data: [],
      reload: vi.fn(),
    });

    render(<ManualRunsPage />);

    expect(screen.getByText("Belum ada sesi pengukuran manual")).toBeInTheDocument();
  });

  it("renders error state when fetching sessions fails", () => {
    signedInAs("admin");
    useManualSessionsMock.mockReturnValue({
      status: "error",
      message: "Gagal memuat daftar sesi.",
      reload: vi.fn(),
    });

    render(<ManualRunsPage />);

    expect(screen.getByText("Gagal memuat daftar sesi.")).toBeInTheDocument();
  });
});
