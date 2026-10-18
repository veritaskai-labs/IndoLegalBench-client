import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "@/lib/apiClient";
import { listActiveSuites } from "./suiteApi";
import type { Suite, SuitePage } from "@/types/suite";

const fetchMock = vi.mocked(apiFetch);

// Pemantauan review hanya memakai id, jadi fixture-nya tidak meniru SuiteRead utuh.
function suite(id: string): Suite {
  return { id, name: `Suite ${id}` } as Suite;
}

function page(items: Suite[], total: number): SuitePage {
  return { items, total, page: 1, size: 100 } as SuitePage;
}

describe("listActiveSuites", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // Positif
  it("asks for the active suites only", async () => {
    fetchMock.mockResolvedValue(page([suite("s1")], 1));

    await expect(listActiveSuites()).resolves.toEqual([suite("s1")]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/suites?status=active&page=1&size=100",
    );
  });

  // Sudut
  it("keeps asking until it has every suite", async () => {
    const first = Array.from({ length: 100 }, (_, index) => suite(`s${index}`));
    fetchMock
      .mockResolvedValueOnce(page(first, 101))
      .mockResolvedValueOnce(page([suite("s100")], 101));

    await expect(listActiveSuites()).resolves.toHaveLength(101);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/suites?status=active&page=2&size=100",
    );
  });

  // Sudut
  it("stops when a page comes back empty", async () => {
    fetchMock.mockResolvedValue(page([], 5));

    await expect(listActiveSuites()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});