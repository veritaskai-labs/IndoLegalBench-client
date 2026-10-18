import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeVerdictView } from "@/test/reviewFixtures";
import { VerdictSummary } from "./VerdictSummary";

describe("VerdictSummary", () => {
  // Positive
  it("shows the decision and the time in WIB, and says there is no comment", () => {
    // Arrange
    const verdict = makeVerdictView({ decision: "approve", comment: null, submitted_at: "2026-10-14T03:00:00Z" });

    // Act
    render(<VerdictSummary verdict={verdict} />);

    // Assert
    expect(screen.getByText("Dapat dipertahankan sebagaimana tertulis")).toBeInTheDocument();
    expect(screen.getByText("14 Okt 2026, 10.00 WIB")).toBeInTheDocument();
    expect(screen.getByText("Tanpa komentar")).toBeInTheDocument();
  });

  // Positive: line breaks in the comment are kept.
  it("shows the comment of a revision as written", () => {
    // Arrange
    const verdict = makeVerdictView({ decision: "revise", comment: "Baris satu\nBaris dua" });

    // Act
    render(<VerdictSummary verdict={verdict} />);

    // Assert
    expect(screen.getByText("Perlu revisi")).toBeInTheDocument();
    expect(screen.getByText(/Baris satu/)).toHaveClass("whitespace-pre-wrap");
    expect(screen.getByText(/Baris satu/)).toHaveTextContent("Baris satu Baris dua");
    expect(screen.queryByText("Tanpa komentar")).not.toBeInTheDocument();
  });

  // Edge
  it("leaves the time out when the server sent none", () => {
    // Arrange
    const verdict = makeVerdictView({ submitted_at: null });

    // Act
    render(<VerdictSummary verdict={verdict} />);

    // Assert
    expect(screen.queryByText(/WIB/)).not.toBeInTheDocument();
  });
});
