import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

beforeEach(() => {
  useAuthMock.mockReset();
});

describe("TopBar", () => {
  it("shows initials, name and role label", () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Rina Hapsari",
        email: "rina@veritask.id",
        role: "author",
      },
    });

    render(<TopBar />);

    expect(screen.getByText("RH")).toBeInTheDocument();
    expect(screen.getByText("Rina Hapsari")).toBeInTheDocument();
    expect(screen.getByText("Penulis")).toBeInTheDocument();
  });

  it("keeps the brand but hides the user while loading", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    render(<TopBar />);

    expect(screen.getByText("IndoLegalBench")).toBeInTheDocument();
    expect(screen.queryByText("Penulis")).not.toBeInTheDocument();
  });
});