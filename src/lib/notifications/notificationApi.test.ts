import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notificationApi";

const NOTIFICATION_ID = "33333333-3333-3333-3333-333333333333";

// fetch is the only way out of this module, so stubbing it checks the exact request.
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { url, method: init?.method, credentials: init?.credentials };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listNotifications", () => {
  // Positive
  it("asks for the newest page of the given size", async () => {
    // Arrange
    const page = { items: [], total: 0, page: 1, size: 10 };
    fetchMock.mockResolvedValue(jsonResponse(200, page));

    // Act
    const result = await listNotifications(10);

    // Assert
    expect(result).toEqual(page);
    expect(lastRequest()).toEqual({
      url: `${BASE_URL}/notifications?size=10`,
      method: undefined,
      credentials: "include",
    });
  });
});

describe("getUnreadCount", () => {
  // Positive
  it("reads the unread count of the signed-in user", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { count: 3 }));

    // Act
    const result = await getUnreadCount();

    // Assert
    expect(result).toEqual({ count: 3 });
    expect(lastRequest().url).toBe(`${BASE_URL}/notifications/unread-count`);
  });
});

describe("markNotificationRead", () => {
  // Positive
  it("posts to the read endpoint of that notification", async () => {
    // Arrange
    const read = { id: NOTIFICATION_ID, read_at: "2026-10-18T10:00:00Z" };
    fetchMock.mockResolvedValue(jsonResponse(200, read));

    // Act
    const result = await markNotificationRead(NOTIFICATION_ID);

    // Assert
    expect(result).toEqual(read);
    expect(lastRequest()).toMatchObject({
      url: `${BASE_URL}/notifications/${NOTIFICATION_ID}/read`,
      method: "POST",
    });
  });

  // Negative: someone else's notification is not found for this user.
  it("rejects with the status when the notification is not found", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "NOT_FOUND", message: "No" }));

    // Act
    const failure = markNotificationRead(NOTIFICATION_ID);

    // Assert
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 404 });
  });
});

describe("markAllNotificationsRead", () => {
  // Positive
  it("posts to read-all and returns the new unread count", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { count: 0 }));

    // Act
    const result = await markAllNotificationsRead();

    // Assert
    expect(result).toEqual({ count: 0 });
    expect(lastRequest()).toMatchObject({
      url: `${BASE_URL}/notifications/read-all`,
      method: "POST",
    });
  });
});
