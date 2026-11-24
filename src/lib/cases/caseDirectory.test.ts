import { afterEach, describe, expect, it, vi } from "vitest";
import { BASE_URL } from "@/lib/apiClient";
import { listDirectoryCases } from "./caseDirectory";

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
