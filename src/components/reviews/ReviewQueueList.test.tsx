import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ASSIGNMENT_ID,
  makeAssigned,
  makeReviewCopy,
  makeVerdictView,
  OTHER_ASSIGNMENT_ID,
} from "@/test/reviewFixtures";
import { ReviewQueueList } from "./ReviewQueueList";

describe("ReviewQueueList", () => {
  // Positive
  it("links each assignment to its review page with the case code and title", () => {
    // Arrange
    const reviews = [
      makeAssigned({
        assignment_id: ASSIGNMENT_ID,
        case: makeReviewCopy({
          case_code: "ILB-PT-0142",
          identity: { title: "Kewajiban pemberitahuan tertulis sebelum PHK", question: "Q?", category: null },
        }),
      }),
    ];

    // Act
    render(<ReviewQueueList reviews={reviews} />);

    // Assert
    const link = screen.getByRole("link", { name: /ILB-PT-0142/ });
    expect(link).toHaveAttribute("href", `/reviews/${ASSIGNMENT_ID}`);
    expect(link).toHaveTextContent("Kewajiban pemberitahuan tertulis sebelum PHK");
  });

  // Positive
  it("shows the round and when the case was assigned, in WIB", () => {
    // Arrange
    const reviews = [makeAssigned({ round_no: 2, assigned_at: "2026-10-13T08:00:00Z" })];

    // Act
    render(<ReviewQueueList reviews={reviews} />);

    // Assert
    expect(screen.getByText("Putaran 2")).toBeInTheDocument();
    expect(screen.getByText("13 Okt 2026, 15.00 WIB")).toBeInTheDocument();
  });

  // Positive: the queue says where each case stands for this reviewer.
  it("tells a case waiting for the reviewer from one already rated", () => {
    // Arrange
    const reviews = [
      makeAssigned({ assignment_id: ASSIGNMENT_ID, my_verdict: null }),
      makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID, my_verdict: makeVerdictView() }),
    ];

    // Act
    render(<ReviewQueueList reviews={reviews} />);

    // Assert
    const [waiting, rated] = screen.getAllByRole("listitem");
    expect(within(waiting!).getByText("Menunggu penilaian Anda")).toBeInTheDocument();
    expect(within(rated!).getByText("Sudah dinilai, menunggu peninjau lain")).toBeInTheDocument();
  });

  // Edge: the server sends the oldest round first and the page keeps that order.
  it("keeps the order the server sent", () => {
    // Arrange
    const reviews = [
      makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID, case: makeReviewCopy({ case_code: "ILB-A-1" }) }),
      makeAssigned({ assignment_id: ASSIGNMENT_ID, case: makeReviewCopy({ case_code: "ILB-B-2" }) }),
    ];

    // Act
    render(<ReviewQueueList reviews={reviews} />);

    // Assert
    const codes = screen.getAllByRole("link").map((link) => link.textContent);
    expect(codes[0]).toContain("ILB-A-1");
    expect(codes[1]).toContain("ILB-B-2");
  });

  // Edge: an id with reserved characters must not change the route.
  it("encodes the assignment id in the link", () => {
    // Arrange
    const reviews = [makeAssigned({ assignment_id: "a/b?c" })];

    // Act
    render(<ReviewQueueList reviews={reviews} />);

    // Assert
    expect(screen.getByRole("link")).toHaveAttribute("href", "/reviews/a%2Fb%3Fc");
  });

  // Edge
  it("leaves the time out when the server sent none", () => {
    // Arrange
    const reviews = [makeAssigned({ assigned_at: null })];

    // Act
    render(<ReviewQueueList reviews={reviews} />);

    // Assert
    expect(screen.queryByText(/WIB/)).not.toBeInTheDocument();
  });

  // Positive: the list is announced as a list with one item per case.
  it("is a list with one item per assignment", () => {
    // Arrange
    const reviews = [
      makeAssigned({ assignment_id: ASSIGNMENT_ID }),
      makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID }),
    ];

    // Act
    render(<ReviewQueueList reviews={reviews} />);

    // Assert
    expect(screen.getByRole("list", { name: "Antrean tinjauan" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
