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

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
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

const bell = () => screen.getByRole("button", { name: "Notifikasi" });

async function openBell() {
  const user = userEvent.setup();
  render(<NotificationBell />);
  await user.click(bell());
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
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

    it("shows no badge when everything is read", async () => {
      countMock.mockResolvedValue({ count: 0 });

      render(<NotificationBell />);

      await waitFor(() => expect(countMock).toHaveBeenCalled());
      expect(within(bell()).queryByText("0")).not.toBeInTheDocument();
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

    it("hides the button when nothing in the list is unread", async () => {
      listMock.mockResolvedValue(makeNotificationPage([read]));

      await openBell();

      expect(await screen.findByText("PHK-001 perlu revisi")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Tandai semua dibaca" })).not.toBeInTheDocument();
    });
  });
});
