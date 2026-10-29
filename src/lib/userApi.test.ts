import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

import { ApiError, apiFetch } from "@/lib/apiClient";
import {
  activateUser,
  changeUserRole,
  confirmationCount,
  deactivateUser,
  listActiveUsers,
} from "./userApi";
import type { User } from "@/types/user-management";

const fetchMock = vi.mocked(apiFetch);

const REVIEWER: User = {
  id: "u9",
  name: "Aileen",
  email: "aileen@example.com",
  role: "contributor",
  is_active: true,
};

describe("listActiveUsers", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // Positif
  it("asks the server for the active accounts only", async () => {
    fetchMock.mockResolvedValue([REVIEWER]);

    await expect(listActiveUsers()).resolves.toEqual([REVIEWER]);
    expect(fetchMock).toHaveBeenCalledWith("/admin/users?is_active=true");
  });

  // corner
  it("gives an empty list when there is nobody", async () => {
    fetchMock.mockResolvedValue([]);

    await expect(listActiveUsers()).resolves.toEqual([]);
  });
});
describe("activateUser", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // Positif
  it("posts to the activate endpoint and returns the updated member", async () => {
    const reactivated = { ...REVIEWER, is_active: true };
    fetchMock.mockResolvedValue(reactivated);

    await expect(activateUser("u9")).resolves.toEqual(reactivated);
    expect(fetchMock).toHaveBeenCalledWith("/admin/users/u9/activate", { method: "POST" });
  });

  // Negatif
  it("passes the server error on to the caller", async () => {
    const failure = new Error("not_found");
    fetchMock.mockRejectedValue(failure);

    await expect(activateUser("missing")).rejects.toBe(failure);
  });

  // Corner: id dengan karakter khusus tidak boleh membelokkan path
  it("encodes the id so it stays one path segment", async () => {
    fetchMock.mockResolvedValue(REVIEWER);

    await activateUser("a/b");

    expect(fetchMock).toHaveBeenCalledWith("/admin/users/a%2Fb/activate", { method: "POST" });
  });
});

describe("changeUserRole", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // Positif: first call, no confirmation yet.
  it("patches the role without the confirm flag", async () => {
    // Arrange
    fetchMock.mockResolvedValue({ ...REVIEWER, role: "viewer" });

    // Act
    const updated = await changeUserRole("u9", "viewer");

    // Assert
    expect(updated.role).toBe("viewer");
    expect(fetchMock).toHaveBeenCalledWith("/admin/users/u9", {
      method: "PATCH",
      body: JSON.stringify({ role: "viewer" }),
    });
  });

  // Positif: the admin agreed to the dialog, so the same request is sent again with confirm.
  it("adds confirm=true once the admin agreed", async () => {
    fetchMock.mockResolvedValue({ ...REVIEWER, role: "viewer" });

    await changeUserRole("u9", "viewer", true);

    expect(fetchMock).toHaveBeenCalledWith("/admin/users/u9?confirm=true", {
      method: "PATCH",
      body: JSON.stringify({ role: "viewer" }),
    });
  });

  // Negatif
  it("passes the server error on to the caller", async () => {
    const failure = new ApiError(409, "CONFIRMATION_REQUIRED", null, null, [], 2);
    fetchMock.mockRejectedValue(failure);

    await expect(changeUserRole("u9", "viewer")).rejects.toBe(failure);
  });

  // Corner
  it("encodes the id so it stays one path segment", async () => {
    fetchMock.mockResolvedValue(REVIEWER);

    await changeUserRole("a/b", "admin", true);

    expect(fetchMock).toHaveBeenCalledWith("/admin/users/a%2Fb?confirm=true", expect.anything());
  });
});

describe("deactivateUser", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("posts to the deactivate endpoint without the confirm flag", async () => {
    fetchMock.mockResolvedValue({ ...REVIEWER, is_active: false });

    const updated = await deactivateUser("u9");

    expect(updated.is_active).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("/admin/users/u9/deactivate", { method: "POST" });
  });

  it("adds confirm=true once the admin agreed", async () => {
    fetchMock.mockResolvedValue({ ...REVIEWER, is_active: false });

    await deactivateUser("u9", true);

    expect(fetchMock).toHaveBeenCalledWith("/admin/users/u9/deactivate?confirm=true", {
      method: "POST",
    });
  });

  it("encodes the id so it stays one path segment", async () => {
    fetchMock.mockResolvedValue(REVIEWER);

    await deactivateUser("a/b");

    expect(fetchMock).toHaveBeenCalledWith("/admin/users/a%2Fb/deactivate", { method: "POST" });
  });
});

describe("confirmationCount", () => {
  // Positif: only this answer means "ask the admin first".
  it("returns the number of waiting cases for a CONFIRMATION_REQUIRED 409", () => {
    const error = new ApiError(409, "CONFIRMATION_REQUIRED", null, null, [], 4);

    expect(confirmationCount(error)).toBe(4);
  });

  // Negatif: another 409 is a plain failure, not a dialog.
  it("returns null for a 409 with another code", () => {
    const error = new ApiError(409, "TAG_CHANGE_NEEDS_CONFIRMATION", null, null, [], 4);

    expect(confirmationCount(error)).toBeNull();
  });

  // Edge: without a count there is nothing honest to show in the dialog.
  it("returns null when the 409 carries no count", () => {
    const error = new ApiError(409, "CONFIRMATION_REQUIRED");

    expect(confirmationCount(error)).toBeNull();
  });

  it("returns null for other statuses and for errors that are not ApiError", () => {
    expect(confirmationCount(new ApiError(500, "CONFIRMATION_REQUIRED", null, null, [], 4))).toBeNull();
    expect(confirmationCount(new Error("offline"))).toBeNull();
    expect(confirmationCount(undefined)).toBeNull();
  });
});
