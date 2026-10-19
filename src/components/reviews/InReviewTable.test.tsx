import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InReviewTable } from "./InReviewTable";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import type { CaseReview, ReviewerSlot } from "@/types/reviewAdmin";
import userEvent from "@testing-library/user-event";

function slot(overrides: Partial<ReviewerSlot> = {}): ReviewerSlot {
  return {
    assignment_id: "a1",
    reviewer: { id: "u1", name: "Roben" },
    status: "active",
    verdict: null,
    ...overrides,
  };
}

function review(overrides: Partial<CaseReview> = {}): CaseReview {
  return {
    case_id: "c1",
    case_version_id: "v1",
    round_no: 1,
    status: "open",
    decision: null,
    opened_at: "2026-10-16T03:00:00Z",
    decided_at: null,
    reviewers: [slot()],
    ...overrides,
  };
}

function row(overrides: Partial<InReviewRow> = {}): InReviewRow {
  return {
    case: {
      id: "c1",
      case_code: "ILB-PT-0142",
      title: "Sengketa tanah warisan",
      split_tag: "dev",
      status: "in_review",
      completeness_pct: 100,
      updated_at: "2026-10-16T03:00:00Z",
    },
    review: review(),
    newVersion: null,
    ...overrides,
  };
}

describe("InReviewTable", () => {
  // Positif
  it("lists the case with its round and round status", () => {
    render(<InReviewTable rows={[row()]} />);

    expect(screen.getByText("ILB-PT-0142")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
    expect(screen.getByText("Ronde 1")).toBeInTheDocument();
    expect(screen.getByText("Sedang dinilai")).toBeInTheDocument();
  });

  // Positif
  it("names every reviewer and whether they have judged", () => {
    const queued = row({
      review: review({
        reviewers: [
          slot({
            assignment_id: "a1",
            reviewer: { id: "u1", name: "Roben" },
            verdict: {
              decision: "approve",
              comment: null,
              submitted_at: "2026-10-16T04:00:00Z",
            },
          }),
          slot({
            assignment_id: "a2",
            reviewer: { id: "u9", name: "Aileen" },
          }),
        ],
      }),
    });

    render(<InReviewTable rows={[queued]} />);

    expect(screen.getByText("Roben")).toBeInTheDocument();
    expect(screen.getByText("Setuju")).toBeInTheDocument();
    expect(screen.getByText("Aileen")).toBeInTheDocument();
    expect(screen.getByText("Belum menilai")).toBeInTheDocument();
  });

  // Positif
  it("shows the comment that came with a verdict", () => {
    const queued = row({
      review: review({
        reviewers: [
          slot({
            verdict: {
              decision: "revise",
              comment: "Pasal 1320 belum dikutip.",
              submitted_at: "2026-10-16T04:00:00Z",
            },
          }),
        ],
      }),
    });

    render(<InReviewTable rows={[queued]} />);

    expect(screen.getByText("Minta revisi")).toBeInTheDocument();
    expect(screen.getByText("Pasal 1320 belum dikutip.")).toBeInTheDocument();
  });

  // Positif (F-02)
  it("marks a new version of an approved case", () => {
    render(<InReviewTable rows={[row({ newVersion: 2 })]} />);

    expect(
      screen.getByText("Versi 2 · versi yang disetujui tetap berlaku"),
    ).toBeInTheDocument();
  });

  // Negatif
  it("adds no version mark to a case in its first review", () => {
    render(<InReviewTable rows={[row()]} />);

    expect(screen.queryByText(/versi yang disetujui/)).not.toBeInTheDocument();
  });

  // corner
  it("says the round has not decided yet", () => {
    render(<InReviewTable rows={[row()]} />);

    expect(screen.getByText("Belum diputuskan")).toBeInTheDocument();
  });

  // Positif
  it("names the decision once the round decided", () => {
    const queued = row({
      review: review({ status: "decided", decision: "revise" }),
    });

    render(<InReviewTable rows={[queued]} />);

    expect(screen.getByText("Perlu revisi")).toBeInTheDocument();
    expect(screen.getByText("Sudah diputuskan")).toBeInTheDocument();
  });

  // corner: ronde versi baru bisa terbuka sebelum dua reviewer terpasang (awaiting_assignment).
  it("says so when the round has no reviewer yet", () => {
    const queued = row({
      newVersion: 2,
      review: review({ status: "awaiting_assignment", reviewers: [] }),
    });

    render(<InReviewTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getByText("Belum ada reviewer")).toBeInTheDocument();
    expect(screen.getByText("Menunggu penugasan")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // Negatif
  it("says so when the case has no round yet", () => {
    render(<InReviewTable rows={[row({ review: null })]} />);

    expect(screen.getByText("Belum ada putaran review")).toBeInTheDocument();
  });

  // corner
  it("renders only the header when there is nothing in review", () => {
    render(<InReviewTable rows={[]} />);

    expect(screen.getAllByRole("row")).toHaveLength(1);
  });

  // AC7: reviewer yang lambat tapi masih aktif juga harus bisa diganti dari sini.
  it("hands back the slot and the row when the admin replaces a reviewer", async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const queued = row();

    render(<InReviewTable rows={[queued]} onReplace={onReplace} />);
    await user.click(
      screen.getByRole("button", { name: "Ganti reviewer Roben" }),
    );

    expect(onReplace).toHaveBeenCalledWith(queued.review?.reviewers[0], queued);
  });

  // corner: penugasan yang sudah diganti tidak bisa diganti lagi.
  it("offers no button for a reviewer who was already replaced", () => {
    const queued = row({
      review: review({ reviewers: [slot({ status: "replaced" })] }),
    });

    render(<InReviewTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});