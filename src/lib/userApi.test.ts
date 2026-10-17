import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/lib/apiClient";
import { listActiveUsers } from "./userApi";
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