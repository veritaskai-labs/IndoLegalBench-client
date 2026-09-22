import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me, Role } from "@/types";
import { Sidebar } from "./Sidebar";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

function signedInAs(role: Role) {
  const user: Me = {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Rina Hapsari",
    email: "rina@veritask.id",
    role,
  };
  useAuthMock.mockReturnValue({ status: "authenticated", user });
}

beforeEach(() => {
  useAuthMock.mockReset();
});

describe("Sidebar", () => {
  it("renders nothing until the user is known", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    const { container } = render(<Sidebar />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the links for the role", () => {
    signedInAs("author");

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Dasbor" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Penyedia" }),
    ).not.toBeInTheDocument();
  });

  it("marks the current page", () => {
    signedInAs("admin");

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Dasbor" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Penyedia" }),
    ).not.toHaveAttribute("aria-current");
  });
});