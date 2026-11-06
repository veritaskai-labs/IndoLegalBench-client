import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onForbidden } from "@/lib/apiClient";
import type { CreateRubricVersionRequest, GradingRun, RubricVersion } from "@/types/rubric";
import { httpRubricsGateway } from "./rubricsApi";

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

const version = { id: "v-1", version_no: 1 } as RubricVersion;
const run = { id: "r-1", kind: "regrade", status: "queued", rubric_version_id: "v-2", rubric_version_no: 2 } as GradingRun;
const createBody = { effective_date: "2026-11-06", aspects: [], levels: [] } as unknown as CreateRubricVersionRequest;

describe("listVersions (GET /rubrics)", () => {
  it("returns the versions the server lists", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(200, [version]));

    // Act
    const result = await httpRubricsGateway.listVersions();

    // Assert
    expect(result).toEqual([version]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/rubrics$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  // Edge: before v1 is typed in, the list is empty and that is not an error.
  it("returns an empty list when no version exists yet", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(200, []));

    // Act
    const result = await httpRubricsGateway.listVersions();

    // Assert
    expect(result).toEqual([]);
  });

  // Negative: the page is Admin only, so a 403 goes to /forbidden like every admin page.
  it("fires the forbidden redirect on 403", async () => {
    // Arrange
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    // Act
    const call = httpRubricsGateway.listVersions();

    // Assert
    await expect(call).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(forbidden).toHaveBeenCalledTimes(1);
  });

  it("throws the server error on a 500", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(500, { code: "INTERNAL_ERROR" }));

    // Act
    const call = httpRubricsGateway.listVersions();

    // Assert
    await expect(call).rejects.toMatchObject({ status: 500, code: "INTERNAL_ERROR" });
  });
});

describe("createVersion (POST /rubrics)", () => {
  it("posts the request body and returns the new version", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(201, version));

    // Act
    const result = await httpRubricsGateway.createVersion(createBody);

    // Assert
    expect(result).toEqual(version);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/rubrics$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(createBody);
  });

  // Negative: the field the server refused is kept, so the form can show it next to the input.
  it("hands a 422 with its field and message to the caller", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(422, { code: "VALIDATION_ERROR", message: "Bobot harus berjumlah 100", field: "aspects[0].weight" }));

    // Act
    const call = httpRubricsGateway.createVersion(createBody);

    // Assert
    await expect(call).rejects.toMatchObject({
      status: 422,
      serverMessage: "Bobot harus berjumlah 100",
      field: "aspects[0].weight",
    });
  });

  // Negative: a role changed while the form was open; the form explains it, no redirect.
  it("keeps the user on the page on 403", async () => {
    // Arrange
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    // Act
    const call = httpRubricsGateway.createVersion(createBody);

    // Assert
    await expect(call).rejects.toMatchObject({ status: 403 });
    expect(forbidden).not.toHaveBeenCalled();
  });
});

describe("regrade (POST /measurements/{id}/grade, AC7)", () => {
  it("asks the server to grade the session with the chosen version", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(202, run));

    // Act
    const result = await httpRubricsGateway.regrade("s-1", { rubric_version_id: "v-2" });

    // Assert
    expect(result).toEqual(run);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/measurements\/s-1\/grade$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ rubric_version_id: "v-2" });
  });

  it("encodes the session id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(202, run));

    // Act
    await httpRubricsGateway.regrade("a/b", { rubric_version_id: "v-2" });

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/a%2Fb\/grade$/);
  });

  it("keeps the user on the page on 403", async () => {
    // Arrange
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    // Act
    const call = httpRubricsGateway.regrade("s-1", { rubric_version_id: "v-2" });

    // Assert
    await expect(call).rejects.toMatchObject({ status: 403 });
    expect(forbidden).not.toHaveBeenCalled();
  });

  // Negative: the session cannot be graded now (still running, wrong state): the server says why.
  it.each([404, 409, 422])("hands a %i to the caller with the server code", async (status) => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(status, { code: "SOME_CODE", message: "Alasan dari server" }));

    // Act
    const call = httpRubricsGateway.regrade("s-1", { rubric_version_id: "v-2" });

    // Assert
    await expect(call).rejects.toMatchObject({ status, code: "SOME_CODE", serverMessage: "Alasan dari server" });
  });
});

describe("listGradingRuns (GET /measurements/{id}/grading-runs, AC7 riwayat)", () => {
  it("returns the grading history of the session", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(200, [run]));

    // Act
    const result = await httpRubricsGateway.listGradingRuns("s-1");

    // Assert
    expect(result).toEqual([run]);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/s-1\/grading-runs$/);
  });

  it("returns an empty list for a session that was never graded", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(200, []));

    // Act
    const result = await httpRubricsGateway.listGradingRuns("s-1");

    // Assert
    expect(result).toEqual([]);
  });

  it("encodes the session id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(200, []));

    // Act
    await httpRubricsGateway.listGradingRuns("a/b");

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/measurements\/a%2Fb\/grading-runs$/);
  });

  // Negative: a session the caller may not see (Developer AI on a running session) is a 403 the page explains.
  it("hands a 403 to the caller without redirecting", async () => {
    // Arrange
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    // Act
    const call = httpRubricsGateway.listGradingRuns("s-1");

    // Assert
    await expect(call).rejects.toMatchObject({ status: 403 });
    expect(forbidden).not.toHaveBeenCalled();
  });
});
