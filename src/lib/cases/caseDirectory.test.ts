import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BASE_URL } from "@/lib/apiClient";
import { DEFAULT_CASE_SORT, listDirectoryCases, SORT_KEY_OF } from "./caseDirectory";

afterEach(() => vi.unstubAllGlobals());

describe("listDirectoryCases", () => {
  it("requests one page from GET /cases with all filters and returns the server envelope", async () => {
    const response = { items: [], total: 53, page: 3, size: 20 };
    const fetch = vi.fn().mockResolvedValue(Response.json(response));
    vi.stubGlobal("fetch", fetch);

    await expect(listDirectoryCases({ q: " PHK & cuti ", status: "approved", suiteId: "suite-id", page: 3 }))
      .resolves.toEqual(response);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    const request = new URL(url, BASE_URL);
    expect(request.pathname).toBe("/cases");
    expect(Object.fromEntries(request.searchParams)).toEqual({
      q: "PHK & cuti", status: "approved", suite_id: "suite-id", page: "3", size: "20",
    });
    expect(options.credentials).toBe("include");
  });

  it("omits blank optional filters for the all-cases view", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [], total: 0, page: 1, size: 20 }));
    vi.stubGlobal("fetch", fetch);

    await listDirectoryCases({ q: " \t ", status: "", suiteId: "", page: 1 });

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${BASE_URL}/cases?page=1&size=20`, expect.anything(),
    );
  });
});

/** Contract guard: the sort values the client sends must be exactly the ones the server accepts. */
function sortKeysFromContract(): string[] {
  const contract = JSON.parse(readFileSync(resolve(process.cwd(), "contract/openapi.json"), "utf-8"));
  return contract.components.schemas.CaseSortKey.enum;
}

describe("SORT_KEY_OF (SCRUM-381)", () => {
  // Positive: every sortable column maps to a value of the contract's CaseSortKey, and none is left out.
  it("maps the sortable columns onto exactly the sort keys of the contract", () => {
    // Arrange
    const accepted = sortKeysFromContract();

    // Act
    const sent = Object.values(SORT_KEY_OF);

    // Assert
    expect([...sent].sort()).toEqual([...accepted].sort());
  });

  // Edge: the Suite column is "suite_name" in the table but "suite" in the API.
  it("sends the suite column as suite", () => {
    // Arrange / Act
    const key = SORT_KEY_OF.suite_name;

    // Assert
    expect(key).toBe("suite");
  });

  // Negative: the Aksi column and the derived completeness are not sortable.
  it("has no entry for the actions column", () => {
    // Arrange / Act
    const columns = Object.keys(SORT_KEY_OF);

    // Assert
    expect(columns).not.toContain("actions");
    expect(columns).not.toContain("completeness_pct");
  });
});

describe("DEFAULT_CASE_SORT (SCRUM-381)", () => {
  // Positive: the list opens newest change first, the same as the server default.
  it("is the last-modified time, newest first", () => {
    // Arrange / Act
    const sort = DEFAULT_CASE_SORT;

    // Assert
    expect(sort).toEqual({ key: "updated_at", direction: "desc" });
  });
});

describe("listDirectoryCases sorting (SCRUM-381)", () => {
  // Positive: sort goes to the server with its API name, next to keyword, filters and page.
  it("sends sort and order together with the filters and the page", async () => {
    // Arrange
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [], total: 0, page: 2, size: 20 }));
    vi.stubGlobal("fetch", fetch);

    // Act
    await listDirectoryCases({
      q: "sewa", status: "draft", suiteId: "suite-id", page: 2, sort: { key: "suite_name", direction: "desc" },
    });

    // Assert
    const request = new URL(fetch.mock.calls[0][0], BASE_URL);
    expect(Object.fromEntries(request.searchParams)).toEqual({
      q: "sewa", status: "draft", suite_id: "suite-id", page: "2", size: "20", sort: "suite", order: "desc",
    });
  });

  // Edge: without a sort the request has no sort or order, so the server default applies.
  it("leaves out sort and order when no sort is given", async () => {
    // Arrange
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [], total: 0, page: 1, size: 20 }));
    vi.stubGlobal("fetch", fetch);

    // Act
    await listDirectoryCases({ q: "", status: "", suiteId: "", page: 1 });

    // Assert
    const request = new URL(fetch.mock.calls[0][0], BASE_URL);
    expect(request.searchParams.has("sort")).toBe(false);
    expect(request.searchParams.has("order")).toBe(false);
  });
});
