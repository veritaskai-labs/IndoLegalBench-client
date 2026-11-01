import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNavProvider } from "./MobileNav";
import { TopBar } from "./TopBar";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
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

  // SCRUM-204 E2E F3: below md the sidebar is hidden, so the top bar opens it.
  it("offers a menu button on phones that opens and closes the navigation", async () => {
    useAuthMock.mockReturnValue(signedIn);
    render(
      <MobileNavProvider>
        <TopBar />
      </MobileNavProvider>,
    );

    const menu = screen.getByRole("button", { name: "Buka menu" });
    expect(menu).toHaveClass("md:hidden");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveAttribute("aria-controls", "mobile-nav");

    await userEvent.click(menu);

    expect(screen.getByRole("button", { name: "Tutup menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("has no menu button before the user is known", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    render(<TopBar />);

    expect(screen.queryByRole("button", { name: "Buka menu" })).not.toBeInTheDocument();
  });

  // Edge: a double space in the name must not add an empty initial.
  it("builds initials from the words that are there", () => {
    useAuthMock.mockReturnValue({ ...signedIn, user: { ...signedIn.user, name: "Rina  Hapsari" } });

    render(<TopBar />);

    expect(screen.getByText("R")).toBeInTheDocument();
  });

  // SCRUM-204 E2E F3: at 375 px the name and role pushed the top bar 18 px past the screen.
  it("keeps the name and role for wider screens and the initials on phones", () => {
    useAuthMock.mockReturnValue(signedIn);

    render(<TopBar />);

    expect(screen.getByText("Rina Hapsari").parentElement).toHaveClass("hidden", "sm:block");
    expect(screen.getByText("RH")).toHaveAttribute("title", "Rina Hapsari · Kontributor");
  });
});
