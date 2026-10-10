import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import type { AuditFilter } from "@/types/audit";
import { auditExportUrl, listAuditActors } from "./auditApi";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
  BASE_URL: "https://api.test",
}));
const fetchMock = vi.mocked(apiFetch);

const FILTER: AuditFilter = { from: "2026-07-09", to: "2026-10-07", page: 1 };

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue([]);
});

describe("listAuditActors", () => {
  // AC3: pengguna nonaktif tetap muncul, karena catatan lama tetap milik mereka.
  it("asks for every user, active or not", async () => {
    await listAuditActors();

    expect(fetchMock).toHaveBeenCalledWith("/admin/users");
  });
});

describe("auditExportUrl", () => {

  it("points at the API, not at the page it is rendered on", () => {
    const url = auditExportUrl(FILTER, "csv");

    expect(url.startsWith("https://api.test/audit-logs/export")).toBe(true);
    expect(url).toContain("format=csv");
  });

  // Corner: `to` inklusif, jadi batas atas harus akhir hari.
  it("sends the whole last day, not midnight", () => {
    const q = new URLSearchParams(auditExportUrl(FILTER, "pdf").split("?")[1]);

    expect(q.get("from")).toBe("2026-07-09T00:00:00");
    expect(q.get("to")).toBe("2026-10-07T23:59:59");
  });
});