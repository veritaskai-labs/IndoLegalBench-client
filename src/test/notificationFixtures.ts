import type { AppNotification, NotificationPage } from "@/types/notification";

export function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: "notif-1",
    type: "review_assigned",
    title: "Tugas review baru",
    body: "Anda ditugaskan mereview sebuah kasus.",
    link: "/reviews/assign-1",
    read_at: null,
    created_at: "2026-10-18T03:00:00Z",
    ...overrides,
  };
}

export function makeNotificationPage(items: AppNotification[]): NotificationPage {
  return { items, total: items.length, page: 1, size: 10 };
}
