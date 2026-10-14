import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeVerdictView } from "@/test/reviewFixtures";
import { OwnVerdictNotice } from "./OwnVerdictNotice";

describe("OwnVerdictNotice", () => {
  // Positive
  it("shows an approval without a comment, with the time in WIB", () => {
    // Arrange
    const verdict = makeVerdictView({ decision: "approve", comment: null, submitted_at: "2026-10-14T03:00:00Z" });

    // Act
    render(<OwnVerdictNotice verdict={verdict} roundStatus="open" roundDecision={null} />);

    // Assert
    expect(screen.getByRole("heading", { name: "Penilaian Anda" })).toBeInTheDocument();
    expect(screen.getByText("Dapat dipertahankan sebagaimana tertulis")).toBeInTheDocument();
    expect(screen.getByText("Tanpa komentar")).toBeInTheDocument();
    expect(screen.getByText("14 Okt 2026, 10.00 WIB")).toBeInTheDocument();
  });

  // Positive
  it("shows a revision with its comment", () => {
    // Arrange
    const verdict = makeVerdictView({ decision: "revise", comment: "Pasal 151 salah\nCek PP 35/2021" });

    // Act
    render(<OwnVerdictNotice verdict={verdict} roundStatus="open" roundDecision={null} />);

    // Assert
    expect(screen.getByText("Perlu revisi")).toBeInTheDocument();
    expect(screen.getByText(/Pasal 151 salah/)).toHaveTextContent("Pasal 151 salah Cek PP 35/2021");
    expect(screen.queryByText("Tanpa komentar")).not.toBeInTheDocument();
  });

  // Positive: the other reviewer is not done yet.
  it("says it is waiting for the other reviewer while the round is open", () => {
    // Arrange
    const verdict = makeVerdictView();

    // Act
    render(<OwnVerdictNotice verdict={verdict} roundStatus="open" roundDecision={null} />);

    // Assert
    expect(screen.getByText("Menunggu peninjau lain menilai.")).toBeInTheDocument();
  });

  // Positive
  it.each([
    ["approved", "Kasus disetujui"],
    ["revise", "Kasus dikembalikan ke penulis untuk revisi"],
  ] as const)("shows the outcome of a decided round: %s", (roundDecision, expected) => {
    // Arrange
    const verdict = makeVerdictView();

    // Act
    render(<OwnVerdictNotice verdict={verdict} roundStatus="decided" roundDecision={roundDecision} />);

    // Assert
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText("Menunggu peninjau lain menilai.")).not.toBeInTheDocument();
  });

  // Edge: a decided round with no decision should not claim an outcome.
  it("only says the round is finished when it is decided without a decision", () => {
    // Arrange
    const verdict = makeVerdictView();

    // Act
    render(<OwnVerdictNotice verdict={verdict} roundStatus="decided" roundDecision={null} />);

    // Assert
    expect(screen.getByText("Putaran tinjauan selesai.")).toBeInTheDocument();
    expect(screen.queryByText("Kasus disetujui")).not.toBeInTheDocument();
  });

  // Edge
  it("leaves the time out when the server sent none", () => {
    // Arrange
    const verdict = makeVerdictView({ submitted_at: null });

    // Act
    render(<OwnVerdictNotice verdict={verdict} roundStatus="open" roundDecision={null} />);

    // Assert
    expect(screen.queryByText(/WIB/)).not.toBeInTheDocument();
  });

  // Negative: once sent, the verdict cannot be changed from here.
  it("has nothing to type into or press", () => {
    // Arrange
    const verdict = makeVerdictView();

    // Act
    render(<OwnVerdictNotice verdict={verdict} roundStatus="open" roundDecision={null} />);

    // Assert
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
