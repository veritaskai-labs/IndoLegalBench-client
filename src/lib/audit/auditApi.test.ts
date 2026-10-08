import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import { listAuditActors } from "./auditApi";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue([]);
});

describe("listAuditActors", () => {
  it("asks for every user, active or not", async () => {
    await listAuditActors();

    expect(fetchMock).toHaveBeenCalledWith("/admin/users");
  });
});