import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_URL } from "@/lib/apiClient";
import { createSnapshot, getSnapshot, listSnapshots } from "./snapshotApi";

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

describe("listSnapshots", () => {
  // Positive
  it("asks for the page and size and returns the page", async () => {
    // Arrange
    const body = { items: [], total: 0, page: 2, size: 10 };
    fetchMock.mockResolvedValue(jsonResponse(200, body));

    // Act
    const page = await listSnapshots(SUITE_ID, 2, 10);

    // Assert
    expect(page).toEqual(body);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/suites/${SUITE_ID}/snapshots?page=2&size=10`);
    expect(init?.method).toBeUndefined();
  });

  // Negative
  it("rejects with status 404 when the suite does not exist", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "SUITE_NOT_FOUND", message: "no suite" }));

    // Act
    const failure = listSnapshots(SUITE_ID, 1, 10);

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 404, code: "SUITE_NOT_FOUND" });
  });

  // Edge
  it("encodes the suite id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    // Act
    await listSnapshots("a/b?c", 1, 10);

    // Assert
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/suites/a%2Fb%3Fc/snapshots?page=1&size=10`);
  });
});

describe("getSnapshot", () => {
  // Positive
  it("gets one snapshot by id", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "snap-1", items: [] }));

    // Act
    const snapshot = await getSnapshot("snap-1");

    // Assert
    expect(snapshot).toEqual({ id: "snap-1", items: [] });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/snapshots/snap-1`);
  });

  // Negative
  it("rejects with status 404 when the snapshot does not exist", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "SNAPSHOT_NOT_FOUND", message: "none" }));

    // Act
    const failure = getSnapshot("snap-9");

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 404, code: "SNAPSHOT_NOT_FOUND" });
  });

  // Edge
  it("encodes the snapshot id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    // Act
    await getSnapshot("a/b");

    // Assert
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/snapshots/a%2Fb`);
  });
});
