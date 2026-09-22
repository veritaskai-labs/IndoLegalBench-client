import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./AuthGuard";

const { replace, useAuthMock } = vi.hoisted(() => ({
  replace: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

function renderGuard() {
  return render(
    <AuthGuard>
      <p>isi halaman</p>
    </AuthGuard>,
  );
}

beforeEach(() => {
  replace.mockClear();
  useAuthMock.mockReset();
});

describe("AuthGuard", () => {
  it("shows loading and holds the page while /me is pending", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    renderGuard();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("isi halaman")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the page when authenticated", () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: { id: "1", name: "Rina", email: "r@v.id", role: "author" },
    });

    renderGuard();

    expect(screen.getByText("isi halaman")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to /login without a session", () => {
    useAuthMock.mockReturnValue({
      status: "unauthenticated",
      reason: "no_session",
    });

    renderGuard();

    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("isi halaman")).not.toBeInTheDocument();
  });

  it("redirects with reason=expired when the session expired", () => {
    useAuthMock.mockReturnValue({
      status: "unauthenticated",
      reason: "expired",
    });

    renderGuard();

    expect(replace).toHaveBeenCalledWith("/login?reason=expired");
  });
});