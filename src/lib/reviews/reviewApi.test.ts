import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import { getCaseReview, listAssignedReviews, listAwaitingRevision, submitVerdict } from "./reviewApi";

const CASE_ID = "11111111-1111-1111-1111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-2222-2222-222222222222";

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

describe("listAssignedReviews", () => {
  // Positive
  it("gets the reviewer's assignments from /reviews/assigned", async () => {
    // Arrange
    const rows = [{ assignment_id: ASSIGNMENT_ID, round_no: 1, my_verdict: null }];
    fetchMock.mockResolvedValue(jsonResponse(200, rows));

    // Act
    const result = await listAssignedReviews();

    // Assert
    expect(result).toEqual(rows);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/reviews/assigned`);
    expect(init?.method).toBeUndefined();
    expect(init?.credentials).toBe("include");
  });

  // Edge: a reviewer with nothing to review gets an empty list, not an error.
  it("returns an empty list when nothing is assigned", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    // Act
    const result = await listAssignedReviews();

    // Assert
    expect(result).toEqual([]);
  });

  // Negative
  it("rejects with the status when the caller is not a reviewer", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(403, { code: "FORBIDDEN", message: "No" }));

    // Act
    const failure = listAssignedReviews();

    // Assert
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

describe("submitVerdict", () => {
  // Positive
  it("posts the decision and comment as JSON to the assignment's verdict endpoint", async () => {
    // Arrange
    const result = { decision: "revise", comment: "Pasal salah", round_status: "open" };
    fetchMock.mockResolvedValue(jsonResponse(201, result));

    // Act
    const created = await submitVerdict(ASSIGNMENT_ID, { decision: "revise", comment: "Pasal salah" });

    // Assert
    expect(created).toEqual(result);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/reviews/${ASSIGNMENT_ID}/verdict`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ decision: "revise", comment: "Pasal salah" });
  });

  // Edge: an approve may carry no comment at all.
  it("sends a null comment when approving without one", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, { decision: "approve" }));

    // Act
    await submitVerdict(ASSIGNMENT_ID, { decision: "approve", comment: null });

    // Assert
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({ decision: "approve", comment: null });
  });

  // Edge: an id with reserved characters must not change the route.
  it("encodes the assignment id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, {}));

    // Act
    await submitVerdict("a/b?c", { decision: "approve", comment: null });

    // Assert
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/reviews/a%2Fb%3Fc/verdict`);
  });

  // Negative
  it("rejects with the field when a revision has no comment", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(422, { code: "COMMENT_REQUIRED", message: "Komentar wajib", field: "comment" }),
    );

    // Act
    const failure = submitVerdict(ASSIGNMENT_ID, { decision: "revise", comment: null });

    // Assert
    await expect(failure).rejects.toMatchObject({
      status: 422,
      code: "COMMENT_REQUIRED",
      field: "comment",
    });
  });

  // Negative
  it("rejects with the server code when the verdict was already sent", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(409, { code: "VERDICT_ALREADY_SUBMITTED", message: "Sudah" }));

    // Act
    const failure = submitVerdict(ASSIGNMENT_ID, { decision: "approve", comment: null });

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 409, code: "VERDICT_ALREADY_SUBMITTED" });
  });
});

describe("getCaseReview", () => {
  // Positive
  it("gets the latest review round of the case", async () => {
    // Arrange
    const review = { case_id: CASE_ID, round_no: 1, status: "open", reviewers: [] };
    fetchMock.mockResolvedValue(jsonResponse(200, review));

    // Act
    const result = await getCaseReview(CASE_ID);

    // Assert
    expect(result).toEqual(review);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/cases/${CASE_ID}/review`);
  });

  // Edge
  it("encodes the case id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    // Act
    await getCaseReview("a/b?c");

    // Assert
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/cases/a%2Fb%3Fc/review`);
  });

  // Negative
  it("rejects with NO_REVIEW_ROUND when the case was never submitted", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "NO_REVIEW_ROUND", message: "Belum" }));

    // Act
    const failure = getCaseReview(CASE_ID);

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 404, code: "NO_REVIEW_ROUND" });
  });
});

describe("listAwaitingRevision", () => {
  // Positive
  it("gets the awaiting-revision queue from /reviews/awaiting-revision", async () => {
    // Arrange
    const rows = [{ assignment_id: ASSIGNMENT_ID, round_no: 1, my_decision: "revise", thread_assignment_ids: [] }];
    fetchMock.mockResolvedValue(jsonResponse(200, rows));

    // Act
    const result = await listAwaitingRevision();

    // Assert
    expect(result).toEqual(rows);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/reviews/awaiting-revision`);
    expect(init?.method).toBeUndefined();
    expect(init?.credentials).toBe("include");
  });

  // Edge: nothing waiting for the author is a valid answer.
  it("returns an empty list when no case waits for revision", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    // Act
    const result = await listAwaitingRevision();

    // Assert
    expect(result).toEqual([]);
  });

  // Negative
  it("rejects with the status when the caller is not a reviewer", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(403, { code: "FORBIDDEN", message: "No" }));

    // Act
    const failure = listAwaitingRevision();

    // Assert
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});
