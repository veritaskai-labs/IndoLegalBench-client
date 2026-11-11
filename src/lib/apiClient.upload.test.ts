import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, apiFetchBlob, onForbidden } from "./apiClient";

const fetchMock = vi.fn();
const unsubscribers: Array<() => void> = [];

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function blobResponse(status: number, blob: Blob) {
  return { ok: status >= 200 && status < 300, status, blob: () => Promise.resolve(blob) } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("apiFetch with a FormData body (multipart upload)", () => {
  // Positive: the browser has to set the multipart boundary itself, so no JSON content type.
  it("does not force a JSON Content-Type", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, { id: "e-1" }));
    const body = new FormData();
    body.append("url", "https://contoh.id");

    // Act
    await apiFetch("/upload", { method: "POST", body });

    // Assert
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).not.toHaveProperty("Content-Type");
    expect(init.body).toBe(body);
    expect(init.credentials).toBe("include");
  });

  // Edge: other headers set by the caller are kept.
  it("keeps the headers the caller passes", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, {}));

    // Act
    await apiFetch("/upload", { method: "POST", body: new FormData(), headers: { "X-Test": "1" } });

    // Assert
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "X-Test": "1" });
  });

  // Edge: a JSON body keeps the JSON header, nothing changed for existing callers.
  it("still sends the JSON Content-Type for a text body", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    // Act
    await apiFetch("/x", { method: "POST", body: "{}" });

    // Assert
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "Content-Type": "application/json" });
  });
});

describe("apiFetchBlob (evidence download)", () => {
  // Positive: the file comes back as a Blob, with the session cookie.
  it("returns the response body as a Blob", async () => {
    // Arrange
    const file = new Blob(["%PDF"], { type: "application/pdf" });
    fetchMock.mockResolvedValue(blobResponse(200, file));

    // Act
    const result = await apiFetchBlob("/file");

    // Assert
    expect(result).toBe(file);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "include" });
  });

  // Negative: errors are parsed the same way as apiFetch.
  it("throws ApiError with the server code on failure", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "EVIDENCE_NOT_FOUND", message: "Bukti tidak ditemukan" }));

    // Act
    const call = apiFetchBlob("/file");

    // Assert
    await expect(call).rejects.toMatchObject({ status: 404, code: "EVIDENCE_NOT_FOUND" });
    await expect(call).rejects.toBeInstanceOf(ApiError);
  });

  // Edge: 403 still sends the user to /forbidden unless the caller asks for silence.
  it("notifies on 403 like apiFetch", async () => {
    // Arrange
    const listener = vi.fn();
    unsubscribers.push(onForbidden(listener));
    fetchMock.mockResolvedValue(jsonResponse(403, { code: "FORBIDDEN", message: "x" }));

    // Act
    await apiFetchBlob("/file").catch(() => undefined);

    // Assert
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
