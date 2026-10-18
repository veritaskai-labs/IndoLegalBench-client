import { apiFetch } from "@/lib/apiClient";
import type { AppNotification, NotificationPage, UnreadCount } from "@/types/notification";

/** GET /notifications. Notifikasi pengguna yang login, terbaru dulu. */
export function listNotifications(size: number): Promise<NotificationPage> {
  return apiFetch<NotificationPage>(`/notifications?size=${size}`);
}

/** GET /notifications/unread-count. Jumlah untuk badge lonceng. */
export function getUnreadCount(): Promise<UnreadCount> {
  return apiFetch<UnreadCount>("/notifications/unread-count");
}

/** POST /notifications/{id}/read. Notifikasi milik orang lain dijawab 404. */
export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}

/** POST /notifications/read-all. Mengembalikan jumlah belum dibaca yang baru. */
export function markAllNotificationsRead(): Promise<UnreadCount> {
  return apiFetch<UnreadCount>("/notifications/read-all", { method: "POST" });
}
