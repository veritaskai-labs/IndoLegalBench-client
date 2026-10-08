import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditLogs } from "@/lib/audit/auditApi";
import type { AuditEntry, AuditPage } from "@/types/audit";
import { useAuditLog } from "./useAuditLog";

vi.mock("@/lib/audit/auditApi", () => ({ listAuditLogs: vi.fn() }));
const list = vi.mocked(listAuditLogs);

const TODAY = new Date("2026-10-06T00:00:00Z");

function entry(id: number): AuditEntry {
  return {
    id,
    occurred_at: "2026-10-06T03:30:00Z",
    actor_user_id: "u1",
    actor_name: "Herdayani",
    actor_role: "author",
    action: "case.updated",
    entity_type: "case",
    entity_id: "c1",
    case_id: "c1",
    before: null,
    after: null,
    reason: null,
    request_id: null,
  };
}

function page(items: AuditEntry[], total = items.length): AuditPage {
  return { items, total, page: 1, size: 20 };
}

beforeEach(() => {
  list.mockReset();
});

describe("useAuditLog", () => {
  // Positive
  it("starts loading, then hands over the entries it received", async () => {
    list.mockResolvedValue(page([entry(1)]));

    const { result } = renderHook(() => useAuditLog(TODAY));

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state).toMatchObject({ status: "ready", total: 1 });
  });

  // Positive
  it("asks for the last 90 days when the reader has not picked a range", async () => {
    list.mockResolvedValue(page([]));

    renderHook(() => useAuditLog(TODAY));

    await waitFor(() =>
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ from: "2026-07-08", to: "2026-10-06", page: 1 }),
      ),
    );
  });

  // Positive
  it("asks again with the new filter and goes back to the first page", async () => {
    list.mockResolvedValue(page([]));
    const { result } = renderHook(() => useAuditLog(TODAY));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    act(() => result.current.setFilter({ entity_type: "suite" }));

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ entity_type: "suite", page: 1 }),
      ),
    );
  });

  // Negative
  it("reports an error when the request fails, and loads again on retry", async () => {
    list.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useAuditLog(TODAY));
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    list.mockResolvedValueOnce(page([entry(1)]));
    act(() => result.current.reload());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
  });

  // Corner
  it("ignores a stale reply when the reader changes the filter quickly", async () => {
    let resolveFirst!: (value: AuditPage) => void;
    list
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(page([entry(2)]));

    const { result } = renderHook(() => useAuditLog(TODAY));
    act(() => result.current.setFilter({ entity_type: "user" }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      resolveFirst(page([entry(3)]));
    });

    expect(result.current.state).toMatchObject({
      status: "ready",
      entries: [expect.objectContaining({id: 2 })],
    });
  });
});