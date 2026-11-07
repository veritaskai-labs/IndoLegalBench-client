import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onForbidden } from "@/lib/apiClient";
import type { CreateRubricVersionRequest, RubricVersion } from "@/types/rubric";
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
const createBody = { effective_date: "2026-11-06", aspects: [], levels: [] } as unknown as CreateRubricVersionRequest;

describe("listVersions (GET /admin/rubrics)", () => {
  it("returns the versions the server lists", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(200, [version]));

    // Act
    const result = await httpRubricsGateway.listVersions();

    // Assert
    expect(result).toEqual([version]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/admin\/rubrics$/);
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

describe("createVersion (POST /admin/rubrics)", () => {
  it("posts the request body and returns the new version", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(201, version));

    // Act
    const result = await httpRubricsGateway.createVersion(createBody);

    // Assert
    expect(result).toEqual(version);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/admin\/rubrics$/);
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

// The re-grade call moved to the grading gateway; this one only owns the rubric versions.
describe("RubricsGateway surface", () => {
  it("only exposes the rubric version calls", () => {
    // Arrange
    const members = Object.keys(httpRubricsGateway).sort();

    // Act / Assert
    expect(members).toEqual(["createVersion", "listVersions"]);
  });
});
