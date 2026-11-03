import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RunsPage from "./page";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

vi.mock("@/hooks/useAuth");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseRouter = vi.mocked(useRouter);

describe("RunsPage (/runs)", () => {
  const replaceMock = vi.fn();
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      replace: replaceMock,
      push: pushMock,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("renders loading state when session is loading", () => {
    mockUseAuth.mockReturnValue({ status: "loading" });
    render(<RunsPage />);
    expect(screen.queryByText("Eksekusi Pengukuran")).toBeNull();
  });

  it("renders runs landing page for admin", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        id: "admin-id",
        name: "Admin",
        email: "admin@veritask.test",
        role: "admin",
      },
    });

    render(<RunsPage />);

    expect(screen.getByText("Eksekusi Pengukuran")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pengukuran Baru" })).toHaveAttribute(
      "href",
      "/runs/new"
    );

    const createButton = screen.getByRole("button", {
      name: "Buat Pengukuran Baru",
    });
    await userEvent.click(createButton);
    expect(pushMock).toHaveBeenCalledWith("/runs/new");
  });

  it("renders runs landing page for developer_ai", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        id: "dev-id",
        name: "Dev AI",
        email: "dev@veritask.test",
        role: "developer_ai",
      },
    });

    render(<RunsPage />);
    expect(screen.getByText("Eksekusi Pengukuran")).toBeInTheDocument();
  });

  it("redirects contributor to /forbidden", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        id: "contributor-id",
        name: "Contributor",
        email: "contributor@veritask.test",
        role: "contributor",
      },
    });

    render(<RunsPage />);
    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
  });
});
