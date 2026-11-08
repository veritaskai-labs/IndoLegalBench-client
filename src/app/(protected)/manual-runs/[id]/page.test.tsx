import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManualSessionDetailPage from "./page";
import type { Role } from "@/types";
import type { ManualSessionDetail } from "@/types/measurement";

const { useAuthMock, replaceMock, pushMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  useParams: () => ({ id: "session-123" }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const { useManualSessionDetailMock } = vi.hoisted(() => ({
  useManualSessionDetailMock: vi.fn(),
}));

vi.mock("@/hooks/useManualSessionDetail", () => ({
  useManualSessionDetail: (id: string, unfilledOnly: boolean) =>
    useManualSessionDetailMock(id, unfilledOnly),
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

function mockSession(overrides: Partial<ManualSessionDetail> = {}): ManualSessionDetail {
  return {
    id: "session-123",
    label: "Pengukuran LegalHero Batch 1",
    purpose: "official",
    status: "partially_filled",
    product_name: "LegalHero",
    vendor_name: "LegalHero Inc",
    site_url: "https://legalhero.id",
    manual_params: "Paket Premium 299k",
    case_filter: "both",
    repetitions: 1,
    filled_answers: 1,
    total_answers: 2,
    answer_date_from: "2026-11-01T00:00:00Z",
    answer_date_to: "2026-11-05T00:00:00Z",
    date_range_warning: false,
    created_by: "u-admin",
    created_at: "2026-11-01T10:00:00Z",
    finalized_at: null,
    finalized_by: null,
    cases: [
      {
        snapshot_item_id: "snap-1",
        case_id: "c-1",
        case_code: "KASUS-001",
        title: "Kasus Pencurian Biasa",
        question: "Apakah tindakan tersebut memenuhi unsur Pasal 362 KUHP?",
        split_tag: "dev",
        filled: true,
        attempts: [
          {
            attempt_id: "att-1",
            repetition_no: 1,
            filled: true,
            answered_at_platform: "2026-11-02T10:00:00Z",
            source: "manual",
            platform_refused: false,
            evidence_count: null,
          },
        ],
      },
      {
        snapshot_item_id: "snap-2",
        case_id: "c-2",
        case_code: "KASUS-002",
        title: "Kasus Penipuan Bisnis",
        question: "Bagaimana kualifikasi tindak pidana penipuan ini?",
        split_tag: "test",
        filled: false,
        attempts: [
          {
            attempt_id: "att-2",
            repetition_no: 1,
            filled: false,
            answered_at_platform: null,
            source: "manual",
            platform_refused: false,
            evidence_count: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("ManualSessionDetailPage (PBI-22 AC8, AC11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when authentication is loading", () => {
    signedInAs(null, "loading");
    useManualSessionDetailMock.mockReturnValue({ status: "loading" });

    render(<ManualSessionDetailPage />);

    expect(screen.getByText("Memuat…")).toBeInTheDocument();
  });

  it("redirects unauthorized roles (developer_ai, viewer) to /forbidden", () => {
    signedInAs("developer_ai");
    useManualSessionDetailMock.mockReturnValue({ status: "ready", data: mockSession() });

    render(<ManualSessionDetailPage />);

    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
  });

  it("renders loading state when session detail is loading", () => {
    signedInAs("contributor");
    useManualSessionDetailMock.mockReturnValue({ status: "loading" });

    render(<ManualSessionDetailPage />);

    expect(screen.getByText("Memuat…")).toBeInTheDocument();
  });

  it("renders error state when session detail fails to load", () => {
    signedInAs("contributor");
    useManualSessionDetailMock.mockReturnValue({
      status: "error",
      message: "Sesi tidak ditemukan.",
      reload: vi.fn(),
    });

    render(<ManualSessionDetailPage />);

    expect(screen.getByText("Sesi tidak ditemukan.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke Pengukuran Manual" })).toBeInTheDocument();
  });

  it("renders detail view with header and case cards for allowed users", async () => {
    const user = userEvent.setup();
    signedInAs("admin");
    const session = mockSession();
    useManualSessionDetailMock.mockReturnValue({
      status: "ready",
      data: session,
      reload: vi.fn(),
    });

    render(<ManualSessionDetailPage />);

    // Header & session info
    expect(screen.getByRole("heading", { name: "Pengukuran LegalHero Batch 1" })).toBeInTheDocument();
    expect(screen.getByText("LegalHero")).toBeInTheDocument();

    // Cases
    expect(screen.getByText("Daftar Kasus (2)")).toBeInTheDocument();
    expect(screen.getByText("Kasus Pencurian Biasa")).toBeInTheDocument();
    expect(screen.getByText("Kasus Penipuan Bisnis")).toBeInTheDocument();

    // Breadcrumb click
    const breadcrumbBtn = screen.getByRole("button", { name: "Pengukuran Manual" });
    await user.click(breadcrumbBtn);
    expect(pushMock).toHaveBeenCalledWith("/manual-runs");
  });

  it("filters case cards when 'Hanya yang belum terisi' is checked", async () => {
    const user = userEvent.setup();
    signedInAs("contributor");
    const session = mockSession();
    useManualSessionDetailMock.mockReturnValue({
      status: "ready",
      data: session,
      reload: vi.fn(),
    });

    render(<ManualSessionDetailPage />);

    const filterCheckbox = screen.getByLabelText("Hanya yang belum terisi");
    expect(filterCheckbox).not.toBeChecked();

    await user.click(filterCheckbox);
    expect(useManualSessionDetailMock).toHaveBeenCalledWith("session-123", true);
  });

  it("keeps shell and header mounted without blanking when toggling filter or refetching", async () => {
    const user = userEvent.setup();
    signedInAs("contributor");
    const session = mockSession();
    useManualSessionDetailMock.mockReturnValue({
      status: "ready",
      data: session,
      reload: vi.fn(),
    });

    const { rerender } = render(<ManualSessionDetailPage />);
    expect(screen.getByRole("heading", { name: "Pengukuran LegalHero Batch 1" })).toBeInTheDocument();

    const filterCheckbox = screen.getByLabelText("Hanya yang belum terisi");
    await user.click(filterCheckbox);

    // Transition hook to loading state during refetch
    useManualSessionDetailMock.mockReturnValue({
      status: "loading",
      reload: vi.fn(),
    });
    rerender(<ManualSessionDetailPage />);

    // Header and title still mounted (page does not blank)
    expect(screen.getByRole("heading", { name: "Pengukuran LegalHero Batch 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Hanya yang belum terisi")).toBeInTheDocument();
    expect(screen.getByText("Memuat…")).toBeInTheDocument();
  });

  it("renders empty state message when cases list is empty", () => {
    signedInAs("admin");
    const session = mockSession({ cases: [] });
    useManualSessionDetailMock.mockReturnValue({
      status: "ready",
      data: session,
      reload: vi.fn(),
    });

    render(<ManualSessionDetailPage />);

    expect(screen.getByText("Belum ada kasus pada sesi ini.")).toBeInTheDocument();
  });
});
