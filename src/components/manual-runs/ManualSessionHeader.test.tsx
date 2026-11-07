import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManualSessionHeader } from "./ManualSessionHeader";
import type { ManualSessionDetail } from "@/types/measurement";

function createMockDetail(overrides: Partial<ManualSessionDetail> = {}): ManualSessionDetail {
  return {
    id: "session-1",
    label: "Pengukuran LegalHero Batch 1",
    purpose: "official",
    status: "partially_filled",
    product_name: "LegalHero",
    vendor_name: "LegalHero Inc",
    site_url: "https://legalhero.id",
    manual_params: "Paket Premium 299k",
    case_filter: "both",
    repetitions: 1,
    filled_answers: 20,
    total_answers: 50,
    answer_date_from: "2026-11-01T00:00:00Z",
    answer_date_to: "2026-11-07T00:00:00Z",
    date_range_warning: false,
    created_by: "u-admin",
    created_at: "2026-11-01T10:00:00Z",
    finalized_at: null,
    finalized_by: null,
    cases: [],
    ...overrides,
  };
}

describe("ManualSessionHeader (PBI-22 AC8, AC9, AC10, AC12, AC13)", () => {
  it("renders metadata, product info, and progress 'X dari N jawaban terisi'", () => {
    const session = createMockDetail();
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText("Pengukuran LegalHero Batch 1")).toBeInTheDocument();
    expect(screen.getByText("LegalHero")).toBeInTheDocument();
    expect(screen.getByText("LegalHero Inc")).toBeInTheDocument();
    expect(screen.getByText("Paket Premium 299k")).toBeInTheDocument();
    expect(screen.getByText("Pengukuran Resmi")).toBeInTheDocument();
    expect(screen.getByText("Semua (Dev & Test)")).toBeInTheDocument();
    expect(screen.getByText("1 kali")).toBeInTheDocument();

    // Progress
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName.toLowerCase() === "p" && /20 dari 50 jawaban terisi \(40%\)/.test(el.textContent || "")),
    ).toBeInTheDocument();
  });

  it("shows 'Jumlah percobaan berbeda' tag when repetitions is not 3 (AC12)", () => {
    const session = createMockDetail({ repetitions: 1 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText("Jumlah percobaan berbeda")).toBeInTheDocument();
  });

  it("does NOT show 'Jumlah percobaan berbeda' tag when repetitions is 3 (AC12)", () => {
    const session = createMockDetail({ repetitions: 3 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByText("Jumlah percobaan berbeda")).not.toBeInTheDocument();
  });

  it("displays date range warning alert banner when date_range_warning is true (AC13)", () => {
    const session = createMockDetail({ date_range_warning: true });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Rentang tanggal pengambilan jawaban dalam sesi ini melebihi batas hari/i,
    );
  });

  it("calls onToggleUnfilled when the unfilled checkbox is clicked (AC8)", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const session = createMockDetail();

    render(
      <ManualSessionHeader
        session={session}
        role="contributor"
        unfilledOnly={false}
        onToggleUnfilled={onToggle}
        onSessionUpdated={vi.fn()}
      />,
    );

    const checkbox = screen.getByLabelText(/hanya yang belum terisi/i);
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("disables 'Tandai Selesai' and 'Kirim untuk Dinilai' when answers are incomplete (AC8, AC9)", () => {
    const session = createMockDetail({ filled_answers: 49, total_answers: 50 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    const finalizeBtn = screen.getByRole("button", { name: /tandai selesai/i });
    expect(finalizeBtn).toBeDisabled();

    const gradeBtn = screen.getByRole("button", { name: /kirim untuk dinilai/i });
    expect(gradeBtn).toBeDisabled();
  });

  it("enables 'Tandai Selesai' and 'Kirim untuk Dinilai' when all answers are filled (AC8, AC9)", () => {
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    const finalizeBtn = screen.getByRole("button", { name: /tandai selesai/i });
    expect(finalizeBtn).toBeEnabled();

    const gradeBtn = screen.getByRole("button", { name: /kirim untuk dinilai/i });
    expect(gradeBtn).toBeEnabled();
  });

  it("does NOT show 'Kirim untuk Dinilai' button for non-admin users (AC8, AC9)", () => {
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });
    render(
      <ManualSessionHeader
        session={session}
        role="contributor"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /kirim untuk dinilai/i })).not.toBeInTheDocument();
  });

  it("does NOT display cost estimates, budget or failure rates (AC10)", () => {
    const session = createMockDetail();
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByText(/anggaran/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/biaya berjalan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tingkat kegagalan/i)).not.toBeInTheDocument();
  });
});
