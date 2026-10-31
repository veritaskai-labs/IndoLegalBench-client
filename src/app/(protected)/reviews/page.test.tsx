import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listAssignedReviews, listAwaitingRevision } from "@/lib/reviews/reviewApi";
import { session } from "@/test/authMock";
import {
  ASSIGNMENT_ID,
  makeAssigned,
  makeAwaiting,
  makeReviewCopy,
  OTHER_ASSIGNMENT_ID,
} from "@/test/reviewFixtures";
import ReviewsPage from "./page";

vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));
vi.mock("@/lib/reviews/reviewApi", () => ({ listAssignedReviews: vi.fn(), listAwaitingRevision: vi.fn() }));
// The drawer behind each thread button has its own tests.
vi.mock("@/components/reviews/DiscussionLauncher", () => ({
  DiscussionLauncher: ({ label }: { label?: string }) => <button type="button">{label}</button>,
}));

const listMock = vi.mocked(listAssignedReviews);
const awaitingMock = vi.mocked(listAwaitingRevision);

beforeEach(() => {
  listMock.mockReset();
  awaitingMock.mockReset();
  session.role = "contributor";
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
  it.each(["admin", "viewer", "developer_ai"] as const)(
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

describe("ReviewsPage awaiting-revision tab", () => {
  const openTab = async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Menunggu revisi penulis" }));
    return user;
  };

  beforeEach(() => {
    listMock.mockResolvedValue([]);
  });

  // Positive
  it("offers the two tabs and starts on the review queue", async () => {
    // Act
    render(<ReviewsPage />);

    // Assert
    expect(screen.getByRole("tab", { name: "Antrean tinjauan" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Menunggu revisi penulis" })).toHaveAttribute("aria-selected", "false");
    await screen.findByText("Tidak ada kasus untuk ditinjau");
  });

  // Edge: the second queue is only requested when the reviewer opens it.
  it("does not ask for the awaiting-revision queue before its tab is opened", async () => {
    // Act
    render(<ReviewsPage />);
    await screen.findByText("Tidak ada kasus untuk ditinjau");

    // Assert
    expect(awaitingMock).not.toHaveBeenCalled();
  });

  // Positive
  it("lists the cases waiting for the author with a thread button after opening the tab", async () => {
    // Arrange
    awaitingMock.mockResolvedValue([makeAwaiting({ case_code: "ILB-PT-0142" })]);
    render(<ReviewsPage />);

    // Act
    await openTab();

    // Assert
    const list = await screen.findByRole("list", { name: "Menunggu revisi penulis" });
    expect(list).toHaveTextContent("ILB-PT-0142");
    expect(screen.getByRole("button", { name: "Komentar Anda" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Menunggu revisi penulis" })).toHaveAttribute("aria-selected", "true");
    expect(awaitingMock).toHaveBeenCalledTimes(1);
  });

  // Edge: coming back to the first tab does not request the second queue again.
  it("keeps the first queue and does not reload the second when switching back and forth", async () => {
    // Arrange
    awaitingMock.mockResolvedValue([makeAwaiting()]);
    listMock.mockResolvedValue([makeAssigned({ case: makeReviewCopy({ case_code: "ILB-CO-0031" }) })]);
    render(<ReviewsPage />);
    await screen.findByRole("link", { name: /ILB-CO-0031/ });
    const user = await openTab();
    await screen.findByRole("list", { name: "Menunggu revisi penulis" });

    // Act
    await user.click(screen.getByRole("tab", { name: "Antrean tinjauan" }));
    await user.click(screen.getByRole("tab", { name: "Menunggu revisi penulis" }));

    // Assert
    expect(await screen.findByRole("list", { name: "Menunggu revisi penulis" })).toBeInTheDocument();
    expect(awaitingMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  // Edge: an empty second queue is a normal answer.
  it("says nothing waits for revision when the queue is empty", async () => {
    // Arrange
    awaitingMock.mockResolvedValue([]);
    render(<ReviewsPage />);

    // Act
    await openTab();

    // Assert
    expect(await screen.findByText("Tidak ada kasus yang menunggu revisi")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Menunggu revisi penulis" })).not.toBeInTheDocument();
  });

  // Positive
  it("says it is loading while the second queue is on its way", async () => {
    // Arrange
    awaitingMock.mockReturnValue(new Promise(() => undefined));
    render(<ReviewsPage />);

    // Act
    await openTab();

    // Assert
    expect(await screen.findByText("Memuat kasus…")).toBeInTheDocument();
  });

  // Negative
  it("shows the error of the second queue with a retry", async () => {
    // Arrange
    awaitingMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL"));
    awaitingMock.mockResolvedValueOnce([makeAwaiting({ case_code: "ILB-PT-0142" })]);
    render(<ReviewsPage />);
    const user = await openTab();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Gagal memuat kasus yang menunggu revisi. Coba lagi.");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByRole("list", { name: "Menunggu revisi penulis" })).toHaveTextContent("ILB-PT-0142");
    expect(awaitingMock).toHaveBeenCalledTimes(2);
  });

  // Edge: other roles get no tabs and no request, so no 403 redirect.
  it("shows no tabs and no request for a role that is not a reviewer", async () => {
    // Arrange
    session.role = "admin";

    // Act
    render(<ReviewsPage />);

    // Assert
    expect(await screen.findByText("Antrean tinjauan hanya untuk peninjau")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(awaitingMock).not.toHaveBeenCalled();
  });
});
