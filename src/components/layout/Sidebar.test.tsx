import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Me, Role } from "@/types";
import { MobileNavProvider, useMobileNav } from "./MobileNav";
import { PEEK_AFTER_MS, Sidebar } from "./Sidebar";

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
  localStorage.clear();
  // Most tests start after the first-view intro; the intro tests clear this.
  sessionStorage.setItem("ilb:sidebar-intro-seen", "1");
});

describe("Sidebar", () => {
  it("renders nothing until the user is known", () => {
    useAuthMock.mockReturnValue({ status: "loading" });

    const { container } = render(<Sidebar />);

    expect(container).toBeEmptyDOMElement();
  });

  it("names the four modules in English and leaves the other menus in Indonesian", () => {
    signedInAs("admin");

    render(
      <LocaleProvider locale="en">
        <Sidebar />
      </LocaleProvider>,
    );

    expect(screen.getByRole("link", { name: "AI products" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suites and cases" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Laporan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Produk AI" })).not.toBeInTheDocument();
  });

  it("shows only the links for the role", () => {
    signedInAs("contributor");

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Produk AI" }),
    ).not.toBeInTheDocument();
  });

  it("marks the current page", () => {
    signedInAs("admin");

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Beranda" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Produk AI" }),
    ).not.toHaveAttribute("aria-current");
  });

  // SCRUM-204 E2E F3: on a 375 px phone the fixed 256 px sidebar left 119 px for the page.
  it("keeps the side column for tablets and laptops only", () => {
    signedInAs("admin");

    render(<Sidebar />);

    expect(screen.getByRole("complementary")).toHaveClass("hidden", "md:flex");
    expect(screen.queryByRole("dialog", { name: "Menu navigasi" })).not.toBeInTheDocument();
  });

  // SCRUM-347: the column rests as icons; each link keeps its name for screen readers and a tooltip.
  // Widening it with a button locks it open, also after a reload, until Minimize.
  it("starts as icons, and stays open once widened with the button", async () => {
    signedInAs("admin");
    const { unmount } = renderWithMenu();

    expect(screen.getByRole("complementary")).toHaveClass("w-16");
    expect(screen.getByRole("link", { name: "Beranda" })).toHaveAttribute("title", "Beranda");
    // Only the word Minimize is ever drawn; the expand action has no visible label.
    expect(screen.queryByText("Lebarkan menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lebarkan menu" })).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(screen.getByRole("button", { name: "Lebarkan menu" }));
    expect(screen.getByRole("complementary")).toHaveClass("w-62");

    unmount();
    renderWithMenu();

    expect(screen.getByRole("complementary")).toHaveClass("w-62");
    await userEvent.click(screen.getByRole("button", { name: "Minimize menu" }));
    expect(screen.getByRole("complementary")).toHaveClass("w-16");
  });

  // SCRUM-347: the first view in a tab shows the menu names, then folds to icons by itself.
  it("opens wide on the first view in a tab, then minimizes by itself", () => {
    signedInAs("admin");
    sessionStorage.clear();
    vi.useFakeTimers();
    try {
      const { unmount } = renderWithMenu();
      const column = screen.getByRole("complementary");

      expect(column).toHaveClass("w-62");
      act(() => vi.advanceTimersByTime(PEEK_AFTER_MS - 1));
      expect(column).toHaveClass("w-62");
      act(() => vi.advanceTimersByTime(1));
      expect(column).toHaveClass("w-16");

      // Moving to another page or reloading in the same tab does not replay it.
      unmount();
      renderWithMenu();
      expect(screen.getByRole("complementary")).toHaveClass("w-16");
    } finally {
      vi.useRealTimers();
    }
  });

  // Negative: Minimize during the intro only ends it; it does not lock the column open.
  it("ends the intro on Minimize without changing the remembered choice", async () => {
    signedInAs("admin");
    sessionStorage.clear();
    renderWithMenu();

    await userEvent.click(screen.getByRole("button", { name: "Minimize menu" }));

    expect(screen.getByRole("complementary")).toHaveClass("w-16");
    expect(localStorage.getItem("ilb:sidebar-collapsed")).toBeNull();
  });

  // SCRUM-347: resting on an icon widens the collapsed column like the buttons do; leaving it closes it.
  it("peeks open after resting on an icon, and closes when the pointer leaves the column", () => {
    signedInAs("admin");
    localStorage.setItem("ilb:sidebar-collapsed", "1");
    vi.useFakeTimers();
    try {
      renderWithMenu();
      const column = screen.getByRole("complementary");

      fireEvent.mouseEnter(screen.getByRole("link", { name: "Laporan" }));
      act(() => vi.advanceTimersByTime(PEEK_AFTER_MS - 1));
      expect(column).toHaveClass("w-16");
      act(() => vi.advanceTimersByTime(1));
      // The column itself widens, so the page beside it reflows, same as with the Minimize button.
      expect(column).toHaveClass("w-62", "md:sticky");

      fireEvent.mouseLeave(column);
      expect(column).toHaveClass("w-16");
    } finally {
      vi.useRealTimers();
    }
  });

  // Negative: passing over the icons on the way somewhere else does not open the column.
  it("does not peek when the pointer moves off the icon early", () => {
    signedInAs("admin");
    localStorage.setItem("ilb:sidebar-collapsed", "1");
    vi.useFakeTimers();
    try {
      renderWithMenu();
      const link = screen.getByRole("link", { name: "Laporan" });

      fireEvent.mouseEnter(link);
      act(() => vi.advanceTimersByTime(PEEK_AFTER_MS / 2));
      fireEvent.mouseLeave(link);
      act(() => vi.advanceTimersByTime(PEEK_AFTER_MS));

      expect(screen.getByRole("complementary")).toHaveClass("w-16");
    } finally {
      vi.useRealTimers();
    }
  });

  // Negative: an open column has nothing to peek.
  it("does not peek when the column is already open", () => {
    signedInAs("admin");
    localStorage.setItem("ilb:sidebar-collapsed", "0");
    vi.useFakeTimers();
    try {
      renderWithMenu();

      fireEvent.mouseEnter(screen.getByRole("link", { name: "Laporan" }));
      act(() => vi.advanceTimersByTime(PEEK_AFTER_MS));

      expect(screen.getByRole("complementary")).toHaveClass("w-62");
      fireEvent.mouseLeave(screen.getByRole("complementary"));
      expect(screen.getByRole("complementary")).toHaveClass("w-62");
    } finally {
      vi.useRealTimers();
    }
  });

  // Edge: blocked storage (a private window) only forgets the choice; the button still works.
  it("still widens when the browser refuses storage", async () => {
    signedInAs("admin");
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      renderWithMenu();

      await userEvent.click(screen.getByRole("button", { name: "Lebarkan menu" }));

      expect(screen.getByRole("complementary")).toHaveClass("w-62");
    } finally {
      setItem.mockRestore();
    }
  });

  it("shows the same links in a panel when the phone menu is open", async () => {
    signedInAs("contributor");
    renderWithMenu();

    await userEvent.click(screen.getByRole("button", { name: "menu" }));

    const panel = screen.getByRole("dialog", { name: "Menu navigasi" });
    // Sonar S6819: a native <dialog>, not a div with role="dialog".
    expect(panel.tagName).toBe("DIALOG");
    expect(panel).toHaveAttribute("id", "mobile-nav");
    expect(within(panel).getByRole("link", { name: "Beranda" })).toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: "Produk AI" })).not.toBeInTheDocument();
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
    await userEvent.click(within(panel).getByRole("link", { name: "Beranda" }));

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
