import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "./page";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

afterEach(() => {
  useAuthMock.mockReset();
});

function authenticatedAs(name: string) {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { name, email: "rina@veritask.test", role: "author" },
  });
}

describe("DashboardPage", () => {
  it("greets the user by first name", () => {
    authenticatedAs("Rina Kusuma Dewi");

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Selamat pagi, Rina");
  });

  it("uses the whole name when it is a single word", () => {
    authenticatedAs("Rina");

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Selamat pagi, Rina");
  });

  it("shows the greeting without a name when the user is not authenticated yet", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Selamat pagi,$/);
  });
});