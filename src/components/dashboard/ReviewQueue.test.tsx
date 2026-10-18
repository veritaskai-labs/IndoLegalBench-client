import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PendingReview } from "@/types/dashboard";
import { ReviewQueue } from "./ReviewQueue";

function pending(overrides: Partial<PendingReview> = {}): PendingReview {
  return {
    assignment_id: "asg-1",
    case_id: "case-1",
    case_code: "ILB-001",
    title: "Sengketa tanah warisan",
    round_no: 1,
    waiting_since: "2026-10-17T02:00:00Z",
    assigned_at: "2026-10-17T02:00:00Z",
    ...overrides,
  };
}

describe("ReviewQueue", () => {
  // Positive
  it("lists the cases waiting for this reviewer", () => {
    render(<ReviewQueue reviews={[pending()]} />);

    expect(screen.getByText("ILB-001")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
  });

  // AC6: yang paling lama menunggu harus di atas, apa pun urutan dari server.
  it("puts the longest wait first", () => {
    render(
      <ReviewQueue
        reviews={[
          pending({ assignment_id: "baru", case_code: "ILB-009", waiting_since: "2026-10-18T02:00:00Z" }),
          pending({ assignment_id: "lama", case_code: "ILB-002", waiting_since: "2026-10-15T02:00:00Z" }),
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");

    expect(rows[0]).toHaveTextContent("ILB-002");
    expect(rows[1]).toHaveTextContent("ILB-009");
  });

  // AC6: satu klik langsung ke halaman review penugasan itu.
  it("links each row to its review page", () => {
    render(<ReviewQueue reviews={[pending({ assignment_id: "asg 7" })]} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/reviews/asg%207");
  });

  // Corner: antrean kosong bukan error.
  it("says the queue is empty instead of showing a list", () => {
    render(<ReviewQueue reviews={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/tidak ada kasus/i)).toBeInTheDocument();
  });

  // Positive: ronde revisi perlu terlihat, bukan cuma judul.
  it("shows the round being reviewed", () => {
    render(<ReviewQueue reviews={[pending({ round_no: 2 })]} />);

    expect(screen.getByText(/Ronde 2/)).toBeInTheDocument();
  });
});