import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onForbidden } from "@/lib/apiClient";
import { acceptAsIs, cancelSession, clearAcceptAsIs, pauseSession, resumeSession } from "./sessionControlApi";

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

const stopped = { id: "s-1", status: "paused", stopped_at: "2026-11-05T03:00:00Z", stop_reason: "user" };

describe("pauseSession and cancelSession (POST, PBI-12 AC7)", () => {
  it.each([
    ["pause", pauseSession],
    ["cancel", cancelSession],
  ] as const)("sends POST .../%s without a body and returns the 202 answer", async (action, call) => {
    fetchMock.mockResolvedValue(fakeResponse(202, stopped));

    await expect(call("a/b")).resolves.toEqual(stopped);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(new RegExp(`/measurements/a%2Fb/${action}$`));
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  // Negative: a role or the Developer AI flag changed while the page was open.
  it.each([pauseSession, cancelSession])("keeps the user on the page on 403", async (call) => {
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "NOT_YOUR_SESSION" }));

    await expect(call("s-1")).rejects.toMatchObject({ status: 403, code: "NOT_YOUR_SESSION" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("hands a 409 INVALID_TRANSITION to the caller", async () => {
    fetchMock.mockResolvedValue(fakeResponse(409, { code: "INVALID_TRANSITION" }));

    await expect(pauseSession("s-1")).rejects.toMatchObject({ status: 409, code: "INVALID_TRANSITION" });
  });
});

describe("resumeSession (POST .../resume, PBI-12 AC8)", () => {
  const resumed = { id: "s-1", status: "running", resumed_after_long_pause: false, model_version_unverified: false };

  it("asks to resume without confirming an unverified model version", async () => {
    fetchMock.mockResolvedValue(fakeResponse(202, resumed));

    await expect(resumeSession("s-1")).resolves.toEqual(resumed);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/resume$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ confirm_unverified_version: false });
  });

  // server#102: Admin confirms explicitly after a 409 MODEL_VERSION_CONFIRMATION_REQUIRED.
  it("sends the Admin confirmation when asked to", async () => {
    fetchMock.mockResolvedValue(fakeResponse(202, { ...resumed, model_version_unverified: true }));

    await resumeSession("s-1", { confirmUnverifiedVersion: true });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ confirm_unverified_version: true });
  });

  it.each(["MODEL_VERSION_CHANGED", "MODEL_VERSION_CONFIRMATION_REQUIRED", "ANOTHER_SESSION_RUNNING"])(
    "hands a 409 %s to the caller without a redirect",
    async (code) => {
      const forbidden = listenForbidden();
      fetchMock.mockResolvedValue(fakeResponse(409, { code }));

      await expect(resumeSession("s-1")).rejects.toMatchObject({ status: 409, code });
      expect(forbidden).not.toHaveBeenCalled();
    },
  );
});
