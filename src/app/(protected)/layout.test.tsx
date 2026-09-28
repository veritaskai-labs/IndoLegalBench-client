import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProtectedLayout from "./layout";

vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

vi.mock("@/components/layout/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-guard">{children}</div>
  ),
}));

vi.mock("@/components/layout/TopBar", () => ({
  TopBar: () => <header data-testid="top-bar" />,
}));

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => <nav data-testid="sidebar" />,
}));

describe("ProtectedLayout", () => {
  it("wraps the guard inside the auth provider", () => {
    render(<ProtectedLayout>content</ProtectedLayout>);

    const provider = screen.getByTestId("auth-provider");
    expect(within(provider).getByTestId("auth-guard")).toBeInTheDocument();
  });

  it("renders the top bar, sidebar, and page content only inside the guard", () => {
    render(
      <ProtectedLayout>
        <p>Isi halaman</p>
      </ProtectedLayout>,
    );

    const guard = screen.getByTestId("auth-guard");
    expect(within(guard).getByTestId("top-bar")).toBeInTheDocument();
    expect(within(guard).getByTestId("sidebar")).toBeInTheDocument();
    expect(within(guard).getByRole("main")).toHaveTextContent("Isi halaman");
  });
});