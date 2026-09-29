import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCase } from "@/lib/cases/caseApi";
import type { CaseRead } from "@/types/case";
import { useCaseDetail } from "./useCaseDetail";

// The page tests cover the happy paths through this hook. These tests pin the
// race the page cannot show easily: a reply that arrives after the id changed.
vi.mock("@/lib/cases/caseApi", () => ({ getCase: vi.fn() }));

const getCaseMock = vi.mocked(getCase);

function savedCase(id: string): CaseRead {
  return {
    id,
    suite_id: "s",
    case_code: id,
    identity: { title: "", question: "", category: null },
    legal_refs: [],
    answer_criteria: {},
    traps: [],
    split_tag: "dev",
    status: "draft",
    completeness_pct: 0,
    version: 1,
    created_at: "2026-09-29T00:00:00Z",
    updated_at: "2026-09-29T00:00:00Z",
  };
}

/** A promise the test settles by hand, to control reply order. */
function deferred() {
  let resolve: (value: CaseRead) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<CaseRead>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  getCaseMock.mockReset();
});

describe("useCaseDetail", () => {
  it("ignores a late reply for the previous id", async () => {
    const first = deferred();
    getCaseMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(savedCase("B"));
    const { result, rerender } = renderHook(({ id }) => useCaseDetail(id), {
      initialProps: { id: "A" },
    });

    rerender({ id: "B" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => first.resolve(savedCase("A")));

    expect(result.current).toMatchObject({ status: "ready", saved: { id: "B" } });
  });

  it("ignores a late failure for the previous id", async () => {
    const first = deferred();
    getCaseMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(savedCase("B"));
    const { result, rerender } = renderHook(({ id }) => useCaseDetail(id), {
      initialProps: { id: "A" },
    });

    rerender({ id: "B" });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => first.reject(new TypeError("Failed to fetch")));

    expect(result.current).toMatchObject({ status: "ready", saved: { id: "B" } });
  });
});
