import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onForbidden } from "@/lib/apiClient";
import { acceptAsIs, clearAcceptAsIs } from "./sessionControlApi";

// The real apiFetch runs against a stubbed fetch, so the test proves what reaches the wire
// and whether a 403 fires the /forbidden redirect listener.
function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve(body)),
  } as unknown as Response;
}

const fetchMock = vi.fn();
const unsubscribers: Array<() => void> = [];

function listenForbidden() {
  const listener = vi.fn();
  unsubscribers.push(onForbidden(listener));
  return listener;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const accepted = {
  id: "s-1",
  accepted_as_is_at: "2026-11-05T03:00:00Z",
  accepted_as_is_by: "admin-1",
  accepted_as_is_reason: "Kegagalan dari batas kuota penyedia",
};

describe("acceptAsIs (PATCH /measurements/{id}/accept, PBI-12 AC9)", () => {
  it("sends the written reason and returns the accept record", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, accepted));

    await expect(acceptAsIs("s-1", "Kegagalan dari batas kuota penyedia")).resolves.toEqual(accepted);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/accept$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ reason: "Kegagalan dari batas kuota penyedia" });
  });

  it("encodes the session id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, accepted));

    await acceptAsIs("a/b", "Alasan");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/a%2Fb\/accept$/);
  });

  // The server trims and judges the reason (REASON_REQUIRED), so the client sends it as typed.
  it("leaves the reason as typed for the server to judge", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, accepted));

    await acceptAsIs("s-1", "  alasan  ");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ reason: "  alasan  " });
  });

  // Negative: a role changed while the page was open; the dialog explains it, no redirect.
  it("keeps the user on the page on 403 and hands the code to the caller", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(acceptAsIs("s-1", "Alasan")).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it.each([
    [409, "ALREADY_ACCEPTED"],
    [409, "SESSION_NOT_ACCEPTABLE"],
    [422, "REASON_REQUIRED"],
    [404, "MEASUREMENT_NOT_FOUND"],
  ])("hands a %i %s to the caller", async (status, code) => {
    fetchMock.mockResolvedValue(fakeResponse(status, { code }));

    await expect(acceptAsIs("s-1", "Alasan")).rejects.toMatchObject({ status, code });
  });
});

describe("clearAcceptAsIs (DELETE /measurements/{id}/accept, PBI-12 AC9)", () => {
  it("removes the mark and returns the emptied record", async () => {
    const cleared = { id: "s-1", accepted_as_is_at: null, accepted_as_is_by: null, accepted_as_is_reason: null };
    fetchMock.mockResolvedValue(fakeResponse(200, cleared));

    await expect(clearAcceptAsIs("s-1")).resolves.toEqual(cleared);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/accept$/);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  // Negative
  it("keeps the user on the page on 403 and passes 409 NOT_ACCEPTED on", async () => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValueOnce(fakeResponse(403, { code: "FORBIDDEN" }));
    fetchMock.mockResolvedValueOnce(fakeResponse(409, { code: "NOT_ACCEPTED" }));

    await expect(clearAcceptAsIs("s-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(clearAcceptAsIs("s-1")).rejects.toMatchObject({ code: "NOT_ACCEPTED" });
    expect(forbidden).not.toHaveBeenCalled();
  });
});
