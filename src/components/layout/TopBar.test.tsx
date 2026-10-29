import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
// The bell has its own tests; here it only has to be in the right place.
vi.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => <span>Lonceng notifikasi</span>,
}));

const signedIn = {
  status: "authenticated",
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Rina Hapsari",
    email: "rina@veritask.id",
    role: "contributor",
  },
};

beforeEach(() => {
  useAuthMock.mockReset();
});

describe("TopBar", () => {
  it("shows initials, name and role label", () => {
    useAuthMock.mockReturnValue(signedIn);

    render(<TopBar />);

    expect(screen.getByText("RH")).toBeInTheDocument();
    expect(screen.getByText("Rina Hapsari")).toBeInTheDocument();
    expect(screen.getByText("Kontributor")).toBeInTheDocument();
  });

  it("keeps the brand but hides the user while loading", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    render(<TopBar />);

    expect(screen.getByText("IndoLegalBench")).toBeInTheDocument();
    expect(screen.queryByText("Penulis")).not.toBeInTheDocument();
  });

  it("shows the notification bell once the user is signed in", () => {
    useAuthMock.mockReturnValue(signedIn);

    render(<TopBar />);

    expect(screen.getByText("Lonceng notifikasi")).toBeInTheDocument();
  });

  it("hides the notification bell while the session is loading", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    render(<TopBar />);

    expect(screen.queryByText("Lonceng notifikasi")).not.toBeInTheDocument();
  });
});