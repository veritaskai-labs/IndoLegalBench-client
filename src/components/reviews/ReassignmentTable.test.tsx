import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReassignmentTable } from "./ReassignmentTable";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";

function assignment(
  overrides: Partial<ReassignmentAssignment> = {},
): ReassignmentAssignment {
  return {
    id: "a1",
    reviewer_id: "u1",
    reviewer_name: "Roben",
    status: "active",
    source: "system",
    assigned_at: "2026-10-16T03:00:00Z",
    ended_at: null,
    end_reason: null,
    ...overrides,
  };
}

function row(overrides: Partial<ReassignmentRow> = {}): ReassignmentRow {
  return {
    case_id: "c1",
    case_code: "ILB-PT-0142",
    case_title: "Sengketa tanah warisan",
    round_id: "r1",
    round_no: 1,
    round_status: "open",
    active_reviewers_count: 0,
    void_assignments: [],
    assignments: [],
    ...overrides,
  };
}

describe("ReassignmentTable", () => {
  // Positif
  it("lists the case, the round and why it is queued", () => {
    const queued = row({
      void_assignments: [assignment({ id: "a9", status: "void" })],
    });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getByText("ILB-PT-0142")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
    expect(screen.getByText("Ronde 1")).toBeInTheDocument();
    expect(screen.getByText("Sedang dinilai")).toBeInTheDocument();
    expect(screen.getByText("Reviewer dinonaktifkan")).toBeInTheDocument();
  });

  // Positif
  it("names the reviewer who is still assigned", () => {
    const queued = row({ assignments: [assignment({ reviewer_name: "Roben" })] });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getByText("Roben")).toBeInTheDocument();
  });

  // Positif
  it("hands the assignment back when the admin picks ganti reviewer", async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const active = assignment({ id: "a7", reviewer_name: "Roben" });
    const queued = row({ assignments: [active] });

    render(<ReassignmentTable rows={[queued]} onReplace={onReplace} />);
    await user.click(
      screen.getByRole("button", { name: "Ganti reviewer Roben" }),
    );

    expect(onReplace).toHaveBeenCalledWith(active, queued);
  });

  // Negatif
  it("offers no button when no assignment is active yet", () => {
    const queued = row({ round_status: "awaiting_assignment" });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Belum ada penugasan aktif")).toBeInTheDocument();
  });

  // corner
  it("gives one button per active reviewer of the same case", () => {
    const queued = row({
      assignments: [
        assignment({ id: "a1", reviewer_name: "Roben" }),
        assignment({ id: "a2", reviewer_name: "Aileen" }),
      ],
    });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(
      screen.getAllByRole("button", { name: /^Ganti reviewer/ }),
    ).toHaveLength(2);
  });

  // corner
  it("renders only the header when the queue is empty", () => {
    render(<ReassignmentTable rows={[]} onReplace={vi.fn()} />);

    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});