import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me, Role } from "@/types";
import { MobileNavProvider, useMobileNav } from "./MobileNav";
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
    signedInAs("contributor");

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

  // SCRUM-204 E2E F3: on a 375 px phone the fixed 256 px sidebar left 119 px for the page.
  it("keeps the side column for tablets and laptops only", () => {
    signedInAs("admin");

    render(<Sidebar />);

    expect(screen.getByRole("complementary")).toHaveClass("hidden", "md:flex");
    expect(screen.queryByRole("dialog", { name: "Menu navigasi" })).not.toBeInTheDocument();
  });

  it("shows the same links in a panel when the phone menu is open", async () => {
    signedInAs("contributor");
    renderWithMenu();

    await userEvent.click(screen.getByRole("button", { name: "menu" }));

    const panel = screen.getByRole("dialog", { name: "Menu navigasi" });
    // Sonar S6819: a native <dialog>, not a div with role="dialog".
    expect(panel.tagName).toBe("DIALOG");
    expect(panel).toHaveAttribute("id", "mobile-nav");
    expect(within(panel).getByRole("link", { name: "Dasbor" })).toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: "Penyedia" })).not.toBeInTheDocument();
  });

  // Review #63: below sm the top bar shows only the initials, and a tooltip does not show on touch.
  it("shows who is signed in at the top of the phone panel", async () => {
    signedInAs("contributor");
    renderWithMenu();

    await userEvent.click(screen.getByRole("button", { name: "menu" }));

    const panel = screen.getByRole("dialog", { name: "Menu navigasi" });
    expect(within(panel).getByText("Rina Hapsari")).toBeInTheDocument();
    expect(within(panel).getByText("Kontributor")).toBeInTheDocument();
  });

  it("closes the panel when the backdrop is tapped", async () => {
    signedInAs("admin");
    renderWithMenu();
    await userEvent.click(screen.getByRole("button", { name: "menu" }));

    await userEvent.click(screen.getByRole("button", { name: "Tutup menu navigasi" }));

    expect(screen.queryByRole("dialog", { name: "Menu navigasi" })).not.toBeInTheDocument();
  });

  it("keeps the page behind the open menu from scrolling, and restores it on close", async () => {
    signedInAs("admin");
    document.body.style.overflow = "auto";
    renderWithMenu();

    await userEvent.click(screen.getByRole("button", { name: "menu" }));
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.click(screen.getByRole("button", { name: "Tutup menu navigasi" }));
    expect(document.body.style.overflow).toBe("auto");
  });

  it("opens the panel as a modal dialog where the browser supports it", async () => {
    // jsdom has no showModal; real browsers do, and only a modal dialog traps focus.
    signedInAs("admin");
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.showModal = showModal;
    try {
      renderWithMenu();
      await userEvent.click(screen.getByRole("button", { name: "menu" }));

      expect(showModal).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog", { name: "Menu navigasi" })).toHaveAttribute("open");
    } finally {
      // @ts-expect-error -- back to jsdom, which has no showModal
      delete HTMLDialogElement.prototype.showModal;
    }
  });

  it("closes the panel when the browser cancels the dialog (Escape)", async () => {
    signedInAs("admin");
    renderWithMenu();
    await userEvent.click(screen.getByRole("button", { name: "menu" }));

    fireEvent(screen.getByRole("dialog", { name: "Menu navigasi" }), new Event("cancel", { cancelable: true }));

    expect(screen.queryByRole("dialog", { name: "Menu navigasi" })).not.toBeInTheDocument();
  });

  it("closes the panel when a link is chosen, also the link of the current page", async () => {
    signedInAs("admin");
    renderWithMenu();
    await userEvent.click(screen.getByRole("button", { name: "menu" }));

    const panel = screen.getByRole("dialog", { name: "Menu navigasi" });
    await userEvent.click(within(panel).getByRole("link", { name: "Dasbor" }));

    expect(screen.queryByRole("dialog", { name: "Menu navigasi" })).not.toBeInTheDocument();
  });
});

function MenuButton() {
  const { toggle } = useMobileNav();
  return (
    <button type="button" onClick={toggle}>
      menu
    </button>
  );
}

function renderWithMenu() {
  return render(
    <MobileNavProvider>
      <MenuButton />
      <Sidebar />
    </MobileNavProvider>,
  );
}
