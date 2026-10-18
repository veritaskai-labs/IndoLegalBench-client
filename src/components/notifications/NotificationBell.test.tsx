import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/notificationApi";
import { makeNotification, makeNotificationPage } from "@/test/notificationFixtures";
import { NotificationBell } from "./NotificationBell";

const { push, route } = vi.hoisted(() => ({ push: vi.fn(), route: { pathname: "/dashboard" } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => route.pathname,
}));
vi.mock("@/lib/notifications/notificationApi", () => ({
  getUnreadCount: vi.fn(),
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

const countMock = vi.mocked(getUnreadCount);
const listMock = vi.mocked(listNotifications);
const readMock = vi.mocked(markNotificationRead);
const readAllMock = vi.mocked(markAllNotificationsRead);

const unread = makeNotification({ id: "n-baru", title: "Tugas review baru", link: "/reviews/a-1" });
const read = makeNotification({
  id: "n-lama",
  type: "review_decided",
  title: "PHK-001 perlu revisi",
  body: "Pasal tidak sesuai",
  link: "/cases/c-1/edit",
  read_at: "2026-10-18T04:00:00Z",
});

const bell = () => screen.getByRole("button", { name: /^Notifikasi/ });

async function openBell() {
  const user = userEvent.setup();
  render(<NotificationBell />);
  await user.click(bell());
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  route.pathname = "/dashboard";
  countMock.mockResolvedValue({ count: 1 });
  listMock.mockResolvedValue(makeNotificationPage([unread, read]));
  readMock.mockResolvedValue({ ...unread, read_at: "2026-10-18T05:00:00Z" });
  readAllMock.mockResolvedValue({ count: 0 });
});

describe("NotificationBell", () => {
  describe("badge", () => {
    it.each([
      [3, "3"],
      [150, "99+"],
    ])("shows %i unread as %s on the bell", async (count, label) => {
      countMock.mockResolvedValue({ count });

      render(<NotificationBell />);

      expect(await within(bell()).findByText(label)).toBeInTheDocument();
    });

    it("tells screen readers how many are unread", async () => {
      countMock.mockResolvedValue({ count: 3 });

      render(<NotificationBell />);

      expect(
        await screen.findByRole("button", { name: "Notifikasi, 3 belum dibaca" }),
      ).toBeInTheDocument();
    });

    it("shows no badge when everything is read", async () => {
      countMock.mockResolvedValue({ count: 0 });

      render(<NotificationBell />);

      await waitFor(() => expect(countMock).toHaveBeenCalled());
      expect(within(bell()).queryByText("0")).not.toBeInTheDocument();
      expect(bell()).toHaveAccessibleName("Notifikasi");
    });
  });

  describe("membuka daftar", () => {
    it("asks for the 10 newest only once the bell is opened", async () => {
      render(<NotificationBell />);
      await waitFor(() => expect(countMock).toHaveBeenCalled());
      expect(listMock).not.toHaveBeenCalled();

      await userEvent.setup().click(bell());

      expect(listMock).toHaveBeenCalledWith(10);
      expect(bell()).toHaveAttribute("aria-expanded", "true");
    });

    it("lists the title and body of each notification", async () => {
      await openBell();

      const panel = await screen.findByRole("dialog", { name: "Notifikasi" });
      expect(within(panel).getByText("Tugas review baru")).toBeInTheDocument();
      expect(within(panel).getByText("Pasal tidak sesuai")).toBeInTheDocument();
    });

    it("does not ask again when the bell is closed", async () => {
      const user = await openBell();
      await screen.findByText("Tugas review baru");

      await user.click(bell());

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(listMock).toHaveBeenCalledTimes(1);
    });

    it("says there is nothing yet when the list is empty", async () => {
      listMock.mockResolvedValue(makeNotificationPage([]));

      await openBell();

      expect(await screen.findByText("Belum ada notifikasi")).toBeInTheDocument();
    });

    it("shows an error with a retry that loads the list again", async () => {
      listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
      const user = await openBell();
      expect(await screen.findByText("Gagal memuat notifikasi.")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Coba lagi" }));

      expect(await screen.findByText("Tugas review baru")).toBeInTheDocument();
      expect(listMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("menutup daftar", () => {
    it("closes when the reader clicks outside the list", async () => {
      const user = userEvent.setup();
      render(
        <>
          <NotificationBell />
          <p>Isi halaman</p>
        </>,
      );
      await user.click(bell());

      await user.click(screen.getByText("Isi halaman"));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(bell()).toHaveAttribute("aria-expanded", "false");
    });

    it("stays open when the reader clicks inside the list", async () => {
      const user = await openBell();
      const panel = await screen.findByRole("dialog", { name: "Notifikasi" });

      await user.click(within(panel).getByRole("heading", { name: "Notifikasi" }));

      expect(screen.getByRole("dialog", { name: "Notifikasi" })).toBeInTheDocument();
    });

    it("closes on Escape and puts the focus back on the bell", async () => {
      const user = await openBell();
      await screen.findByRole("button", { name: "Tandai semua dibaca" });
      await user.tab();
      expect(bell()).not.toHaveFocus();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(bell()).toHaveFocus();
    });

    it("stays open when another key is pressed", async () => {
      const user = await openBell();
      await screen.findByRole("dialog", { name: "Notifikasi" });

      await user.keyboard("{Tab}");

      expect(screen.getByRole("dialog", { name: "Notifikasi" })).toBeInTheDocument();
    });

    it("closes when the reader moves to another page", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<NotificationBell />);
      await user.click(bell());
      await screen.findByRole("dialog", { name: "Notifikasi" });

      route.pathname = "/reviews";
      rerender(<NotificationBell />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("membuka satu notifikasi", () => {
    it("marks an unread one as read, opens its page and closes the list", async () => {
      const user = await openBell();

      await user.click(await screen.findByRole("button", { name: /Tugas review baru/ }));

      expect(readMock).toHaveBeenCalledWith("n-baru");
      expect(push).toHaveBeenCalledWith("/reviews/a-1");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(countMock).toHaveBeenCalledTimes(2));
    });

    it("opens a read one without marking it again", async () => {
      const user = await openBell();

      await user.click(await screen.findByRole("button", { name: /PHK-001 perlu revisi/ }));

      expect(readMock).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/cases/c-1/edit");
    });

    // Security: follow only in-app paths, never another site (open redirect).
    it.each(["https://evil.example/login", "//evil.example/login", "/\\evil.example/login"])(
      "does not follow a link to another site (%s)",
      async (link) => {
        listMock.mockResolvedValue(makeNotificationPage([makeNotification({ title: "Aneh", link })]));
        const user = await openBell();

        await user.click(await screen.findByRole("button", { name: /Aneh/ }));

        expect(push).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
    );

    // Edge: a failed read mark must not block opening the page.
    it("still opens the page when marking it as read fails", async () => {
      readMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));
      const user = await openBell();

      await user.click(await screen.findByRole("button", { name: /Tugas review baru/ }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/reviews/a-1"));
    });
  });

  describe("tandai semua dibaca", () => {
    it("marks everything read and drops the badge", async () => {
      const user = await openBell();
      expect(await within(bell()).findByText("1")).toBeInTheDocument();
      countMock.mockResolvedValue({ count: 0 });

      await user.click(await screen.findByRole("button", { name: "Tandai semua dibaca" }));

      expect(readAllMock).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(within(bell()).queryByText("1")).not.toBeInTheDocument());
      expect(screen.queryByRole("button", { name: "Tandai semua dibaca" })).not.toBeInTheDocument();
    });

    // Edge: a failed request changes nothing, so the reader can try again.
    it("keeps the button and the badge when marking everything fails", async () => {
      readAllMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));
      const user = await openBell();

      await user.click(await screen.findByRole("button", { name: "Tandai semua dibaca" }));

      expect(readAllMock).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Tandai semua dibaca" })).toBeInTheDocument();
      expect(within(bell()).getByText("1")).toBeInTheDocument();
    });

    // Edge: the badge also counts unread ones beyond the 10 shown.
    // Edge: the list failed, but the badge still knows there is something unread.
    it("marks everything read even when the list failed to load", async () => {
      listMock.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR"));
      const user = await openBell();
      expect(await screen.findByText("Gagal memuat notifikasi.")).toBeInTheDocument();
      countMock.mockResolvedValue({ count: 0 });

      await user.click(screen.getByRole("button", { name: "Tandai semua dibaca" }));

      expect(readAllMock).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(bell()).toHaveAccessibleName("Notifikasi"));
      expect(screen.getByText("Gagal memuat notifikasi.")).toBeInTheDocument();
    });

    it("offers the button when only older notifications are unread", async () => {
      countMock.mockResolvedValue({ count: 12 });
      listMock.mockResolvedValue(makeNotificationPage([read]));

      await openBell();

      expect(await screen.findByRole("button", { name: "Tandai semua dibaca" })).toBeInTheDocument();
    });

    it("hides the button when nothing is unread", async () => {
      countMock.mockResolvedValue({ count: 0 });
      listMock.mockResolvedValue(makeNotificationPage([read]));

      await openBell();

      expect(await screen.findByText("PHK-001 perlu revisi")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Tandai semua dibaca" })).not.toBeInTheDocument();
    });
  });
});
