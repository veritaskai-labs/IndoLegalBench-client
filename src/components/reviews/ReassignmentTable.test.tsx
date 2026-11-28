import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

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
  it("pages the original queue and sorts by numeric round across pages", async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 11 }, (_, i) => row({ round_id: String(i), round_no: 11 - i, case_code: "TEST-" + (11 - i) }));
    render(<ReassignmentTable rows={rows} onReplace={vi.fn()} />);
    expect(screen.queryByText("TEST-1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ronde" }));
    expect(screen.getByText("TEST-1")).toBeVisible();
    expect(screen.queryByText("TEST-11")).not.toBeInTheDocument();
  });

  // Positif
  it("lists the case, the round and why it is queued", () => {
    const queued = row({
      void_assignments: [
        assignment({ id: "a9", status: "void", void_reason: "deactivated" }),
      ],
    });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getByText("ILB-PT-0142")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
    expect(screen.getByText("Ronde 1")).toBeInTheDocument();
    expect(screen.getByText("Sedang dinilai")).toBeInTheDocument();
    expect(screen.getByText("Reviewer dinonaktifkan")).toBeInTheDocument();
  });

  // Positif
  it("has no Reviewer aktif column", () => {
    const queued = row({ assignments: [assignment({ reviewer_name: "Roben" })] });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(
      screen.queryByRole("columnheader", { name: "Reviewer aktif" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Roben")).not.toBeInTheDocument();
  });

  // Negatif
  it("offers no button for a reviewer who is still active", () => {
    const queued = row({ assignments: [assignment({ reviewer_name: "Roben" })] });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /^Ganti / })).not.toBeInTheDocument();
    expect(screen.getByText("Tidak ada penugasan untuk diganti")).toBeInTheDocument();
  });

  // Negatif
  it("offers no button when the round has no assignment yet", () => {
    const queued = row({ round_status: "awaiting_assignment" });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /^Ganti / })).not.toBeInTheDocument();
    expect(screen.getByText("Tidak ada penugasan untuk diganti")).toBeInTheDocument();
  });

  // corner
  it("gives one button per void assignment of the same case", () => {
    const queued = row({
      void_assignments: [
        assignment({ id: "a1", status: "void", reviewer_name: "Roben", void_reason: "role_changed" }),
        assignment({ id: "a2", status: "void", reviewer_name: "Aileen", void_reason: "deactivated" }),
      ],
    });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /^Ganti / })).toHaveLength(2);
    expect(screen.getByText("Ganti Aileen")).toBeVisible();
    expect(screen.getByText("Reviewer dinonaktifkan")).toBeVisible();
  });

  // corner
  it("shows no replacement action when the queue is empty", () => {
    render(<ReassignmentTable rows={[]} onReplace={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /^Ganti / })).not.toBeInTheDocument();
  });
  // AC8: justru baris dengan reviewer nonaktif yang harus bisa diganti dari antrean.
  it("offers a button for a deactivated reviewer too", async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const gone = assignment({
      id: "a9",
      status: "void",
      reviewer_name: "Rina",
      void_reason: "deactivated",
    });
    const queued = row({ void_assignments: [gone] });

    render(<ReassignmentTable rows={[queued]} onReplace={onReplace} />);
    await user.click(
      screen.getByRole("button", { name: "Ganti Rina, reviewer untuk ILB-PT-0142" }),
    );

    expect(onReplace).toHaveBeenCalledWith(gone, queued);
  });

  // corner: satu ronde bisa punya reviewer aktif dan reviewer nonaktif sekaligus.
  it("offers a button only for the deactivated reviewer of a mixed row", () => {
    const queued = row({
      assignments: [assignment({ id: "a1", reviewer_name: "Roben" })],
      void_assignments: [
        assignment({
          id: "a9",
          status: "void",
          reviewer_name: "Rina",
          void_reason: "deactivated",
        }),
      ],
    });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Ganti Roben, reviewer untuk ILB-PT-0142" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ganti Rina, reviewer untuk ILB-PT-0142" }),
    ).toBeInTheDocument();
  });

  // Positif (AC8: reviewer moved to Viewer is still an active account)
  it("names a role change in the reason and on the button", async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const moved = assignment({
      id: "a9",
      status: "void",
      reviewer_name: "Rina",
      void_reason: "role_changed",
    });
    const queued = row({ void_assignments: [moved] });

    render(<ReassignmentTable rows={[queued]} onReplace={onReplace} />);
    await user.click(
      screen.getByRole("button", { name: "Ganti Rina, reviewer untuk ILB-PT-0142" }),
    );

    expect(screen.getByText("Peran reviewer diubah")).toBeInTheDocument();
    expect(screen.queryByText("Reviewer dinonaktifkan")).not.toBeInTheDocument();
    expect(onReplace).toHaveBeenCalledWith(moved, queued);
  });

  // Negatif
  it("stays readable when the void reason is null", () => {
    const queued = row({
      void_assignments: [
        assignment({
          id: "a9",
          status: "void",
          reviewer_name: "Rina",
          void_reason: null,
        }),
      ],
    });

    render(<ReassignmentTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getByText("Reviewer tidak lagi bertugas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ganti Rina, reviewer untuk ILB-PT-0142" }),
    ).toBeInTheDocument();
  });

  it("uses English chrome and leaves the case title unchanged", () => {
    render(
      <LocaleProvider locale="en">
        <ReassignmentTable rows={[row()]} onReplace={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("columnheader", { name: "Code" })).toBeInTheDocument();
    expect(screen.getByText("No assignment to replace")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
  });
});
