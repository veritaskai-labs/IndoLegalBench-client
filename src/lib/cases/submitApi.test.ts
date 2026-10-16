import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import { submitForReview } from "./submitApi";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

const SUBMITTED = {
  case_id: "c1",
  version: 1,
  status: "in_review" as const,
  round_no: 1,
  round_status: "awaiting_assignment",
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(SUBMITTED);
});

describe("submitForReview", () => {
  // Positive
  it("posts to the submit-review endpoint of that case", async () => {
    await submitForReview("c1");

    expect(fetchMock).toHaveBeenCalledWith("/cases/c1/submit-review", {
      method: "POST",
    });
  });

  // Positive
  it("hands back what the server returned", async () => {
    await expect(submitForReview("c1")).resolves.toEqual(SUBMITTED);
  });

  // Corner: id kasus bisa memuat karakter yang harus di-escape di URL.
  it("encodes the case id once", async () => {
    await submitForReview("a/b");

    expect(fetchMock).toHaveBeenCalledWith("/cases/a%2Fb/submit-review", {
      method: "POST",
    });
  });
});
