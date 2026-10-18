import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NeedsReassignmentCard } from "./NeedsReassignmentCard";

describe("NeedsReassignmentCard", () => {
  // Positive
  it("shows how many cases need a new reviewer", () => {
    render(<NeedsReassignmentCard count={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // AC: kartunya adalah jalan pintas ke halaman penugasan ulang.
  it("links to the admin review page", () => {
    render(<NeedsReassignmentCard count={3} />);

    expect(
      screen.getByRole("link", { name: /penugasan ulang/i }),
    ).toHaveAttribute("href", "/admin/reviews");
  });

  // Corner: nol tetap ditampilkan, supaya admin tahu memang tidak ada yang tertunda.
  it("stays visible with a zero", () => {
    render(<NeedsReassignmentCard count={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});