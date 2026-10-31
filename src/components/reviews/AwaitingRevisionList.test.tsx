import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ASSIGNMENT_ID, makeAwaiting, OTHER_ASSIGNMENT_ID } from "@/test/reviewFixtures";
import { AwaitingRevisionList } from "./AwaitingRevisionList";

// The drawer is covered by its own tests; here only what the list hands to it matters.
vi.mock("./DiscussionLauncher", () => ({
  DiscussionLauncher: ({ assignmentId, label }: { assignmentId: string; label?: string }) => (
    <button type="button" data-assignment={assignmentId}>
      {label}
    </button>
  ),
}));

describe("AwaitingRevisionList", () => {
  // Positive
  it("shows the case code, title, round and decision date in WIB", () => {
    // Arrange
    const reviews = [
      makeAwaiting({ case_code: "ILB-PT-0142", title: "PHK sepihak", round_no: 2, decided_at: "2026-10-14T03:00:00Z" }),
    ];

    // Act
    render(<AwaitingRevisionList reviews={reviews} />);

    // Assert
    const item = within(screen.getByRole("list", { name: "Menunggu revisi penulis" })).getByRole("listitem");
    expect(item).toHaveTextContent("ILB-PT-0142");
    expect(item).toHaveTextContent("PHK sepihak");
    expect(screen.getByText("Putaran 2")).toBeInTheDocument();
    expect(screen.getByText("14 Okt 2026, 10.00 WIB")).toBeInTheDocument();
  });

  // Positive: a reviewer who approved still waits for the author while the peer asked for revision.
  it.each([
    ["approve", "Anda setuju"],
    ["revise", "Anda meminta revisi"],
  ] as const)("labels the reviewer's own decision %s", (decision, label) => {
    // Arrange
    const reviews = [makeAwaiting({ my_decision: decision })];

    // Act
    render(<AwaitingRevisionList reviews={reviews} />);

    // Assert
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // Positive: own thread and the peer's thread each get a button for their own assignment.
  it("opens the own thread and the peer thread with their own assignment ids", () => {
    // Arrange
    const reviews = [
      makeAwaiting({
        assignment_id: ASSIGNMENT_ID,
        thread_assignment_ids: [ASSIGNMENT_ID, OTHER_ASSIGNMENT_ID],
      }),
    ];

    // Act
    render(<AwaitingRevisionList reviews={reviews} />);

    // Assert
    expect(screen.getByRole("button", { name: "Komentar Anda" })).toHaveAttribute("data-assignment", ASSIGNMENT_ID);
    expect(screen.getByRole("button", { name: "Komentar peninjau lain" })).toHaveAttribute(
      "data-assignment",
      OTHER_ASSIGNMENT_ID,
    );
  });

  // Positive: a reviewer who approved without a comment reaches only the peer's thread.
  it("offers only the peer thread when the reviewer wrote no comment", () => {
    // Arrange
    const reviews = [
      makeAwaiting({ my_decision: "approve", thread_assignment_ids: [OTHER_ASSIGNMENT_ID] }),
    ];

    // Act
    render(<AwaitingRevisionList reviews={reviews} />);

    // Assert
    expect(screen.queryByRole("button", { name: "Komentar Anda" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Komentar peninjau lain" })).toBeInTheDocument();
  });

  // Edge: no thread at all means no button, only a plain note.
  it("says there is no comment yet when the case has no thread", () => {
    // Arrange
    const reviews = [makeAwaiting({ thread_assignment_ids: [] })];

    // Act
    render(<AwaitingRevisionList reviews={reviews} />);

    // Assert
    expect(screen.getByText("Belum ada komentar")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // Edge: the decision date can be missing and must not be invented.
  it("omits the date when the server sends none", () => {
    // Arrange
    const reviews = [makeAwaiting({ decided_at: null })];

    // Act
    render(<AwaitingRevisionList reviews={reviews} />);

    // Assert
    expect(screen.queryByText(/WIB/)).not.toBeInTheDocument();
  });

  // Positive: the order from the server is kept.
  it("keeps the server order", () => {
    // Arrange
    const reviews = [
      makeAwaiting({ assignment_id: OTHER_ASSIGNMENT_ID, case_code: "ILB-PT-0002", thread_assignment_ids: [] }),
      makeAwaiting({ assignment_id: ASSIGNMENT_ID, case_code: "ILB-PT-0001", thread_assignment_ids: [] }),
    ];

    // Act
    render(<AwaitingRevisionList reviews={reviews} />);

    // Assert
    const codes = screen.getAllByRole("listitem").map((item) => /ILB-PT-\d+/.exec(item.textContent ?? "")?.[0]);
    expect(codes).toEqual(["ILB-PT-0002", "ILB-PT-0001"]);
  });
});
