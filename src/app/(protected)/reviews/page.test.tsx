import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listAssignedReviews } from "@/lib/reviews/reviewApi";
import { session } from "@/test/authMock";
import { ASSIGNMENT_ID, makeAssigned, makeReviewCopy, OTHER_ASSIGNMENT_ID } from "@/test/reviewFixtures";
import ReviewsPage from "./page";

vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));
vi.mock("@/lib/reviews/reviewApi", () => ({ listAssignedReviews: vi.fn() }));

const listMock = vi.mocked(listAssignedReviews);

beforeEach(() => {
  listMock.mockReset();
  session.role = "reviewer";
});

describe("ReviewsPage", () => {
  // Positive
  it("lists the cases assigned to the reviewer, each linking to its review page", async () => {
    // Arrange
    listMock.mockResolvedValue([
      makeAssigned({ assignment_id: ASSIGNMENT_ID, case: makeReviewCopy({ case_code: "ILB-PT-0142" }) }),
      makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID, case: makeReviewCopy({ case_code: "ILB-CO-0031" }) }),
    ]);

    // Act
    render(<ReviewsPage />);

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "Antrean tinjauan" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /ILB-PT-0142/ })).toHaveAttribute(
      "href",
      `/reviews/${ASSIGNMENT_ID}`,
    );
    expect(screen.getByRole("link", { name: /ILB-CO-0031/ })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  // Positive
  it("says it is loading while the queue is on its way", () => {
    // Arrange
    listMock.mockReturnValue(new Promise(() => undefined));

    // Act
    render(<ReviewsPage />);

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Memuat antrean…");
  });

  // Edge: an empty queue is a normal answer, not an error.
  it("says there is nothing to review when the queue is empty", async () => {
    // Arrange
    listMock.mockResolvedValue([]);

    // Act
    render(<ReviewsPage />);

    // Assert
    expect(await screen.findByText("Tidak ada kasus untuk ditinjau")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Antrean tinjauan" })).not.toBeInTheDocument();
  });

  // Negative
  it("shows the error with a retry that loads the queue again", async () => {
    // Arrange
    listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL"));
    listMock.mockResolvedValueOnce([makeAssigned({ case: makeReviewCopy({ case_code: "ILB-PT-0142" }) })]);
    const user = userEvent.setup();
    render(<ReviewsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat antrean tinjauan. Coba lagi.");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByRole("link", { name: /ILB-PT-0142/ })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  // Edge: the server answers 403 to anyone but a reviewer and a 403 sends the user to /forbidden.
  it.each(["admin", "author", "viewer"] as const)(
    "does not ask the server for the queue when the role is %s",
    async (role) => {
      // Arrange
      session.role = role;
      listMock.mockResolvedValue([makeAssigned()]);

      // Act
      render(<ReviewsPage />);

      // Assert
      expect(await screen.findByText("Antrean tinjauan hanya untuk peninjau")).toBeInTheDocument();
      await waitFor(() => expect(listMock).not.toHaveBeenCalled());
      expect(screen.queryByRole("list", { name: "Antrean tinjauan" })).not.toBeInTheDocument();
    },
  );
});
