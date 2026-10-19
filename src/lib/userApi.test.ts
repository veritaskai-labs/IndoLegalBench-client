import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/lib/apiClient";
import { activateUser, listActiveUsers } from "./userApi";
import type { User } from "@/types/user-management";

const fetchMock = vi.mocked(apiFetch);

const REVIEWER: User = {
  id: "u9",
  name: "Aileen",
  email: "aileen@example.com",
  role: "reviewer",
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
