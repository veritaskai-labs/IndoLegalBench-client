import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_URL } from "@/lib/apiClient";
import { createSnapshot } from "./snapshotApi";

const SUITE_ID = "11111111-1111-1111-1111-111111111111";

// fetch is the only way out of this module, so stubbing it lets us check
// the exact request without a server.
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createSnapshot", () => {
  // Positive
  it("posts without a body to the suite's snapshots endpoint and returns the snapshot", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, { id: "snap-1", items: [] }));

    // Act
    const snapshot = await createSnapshot(SUITE_ID);

    // Assert
    expect(snapshot).toEqual({ id: "snap-1", items: [] });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/suites/${SUITE_ID}/snapshots`);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(init?.body).toBeUndefined();
  });

  // Negative
  it("rejects with the server code when the suite has no approved case", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(422, { code: "NOTHING_TO_SNAPSHOT", message: "No approved case" }),
    );

    // Act
    const failure = createSnapshot(SUITE_ID);

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 422, code: "NOTHING_TO_SNAPSHOT" });
  });

  it("rejects with status 403 when the user is not an admin", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(403, { code: "FORBIDDEN", message: "Admin only" }));

    // Act
    const failure = createSnapshot(SUITE_ID);

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 403 });
  });

  // Edge: an id with reserved characters must not change the route.
  it("encodes the suite id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, {}));

    // Act
    await createSnapshot("a/b?c");

    // Assert
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/suites/a%2Fb%3Fc/snapshots`);
  });
});
