import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ManualSessionTable } from "./ManualSessionTable";
import type { SessionListItem } from "@/types/measurement";

function createMockSession(overrides: Partial<SessionListItem> = {}): SessionListItem {
  return {
    id: "session-1",
    label: "Uji Manual Justisio",
    created_at: "2026-11-07T10:00:00Z",
    created_by: "u-1",
    created_by_name: "Admin Legal",
    product_id: "prod-1",
    product_name: "Justisio",
    case_count: 50,
    repetitions: 1,
    status: "not_filled",
    progress: { completed: 0, total: 50 },
    ...overrides,
  };
}

describe("ManualSessionTable (PBI-22 AC8, AC10, AC11)", () => {
  it("renders the table headers and session rows correctly", () => {
    const sessions = [
      createMockSession({
        id: "s-1",
        label: "Sesi 1",
        status: "not_filled",
        progress: { completed: 0, total: 20 },
      }),
      createMockSession({
        id: "s-2",
        label: "Sesi 2",
        status: "partially_filled",
        progress: { completed: 10, total: 20 },
      }),
      createMockSession({
        id: "s-3",
        label: "Sesi 3",
        status: "finalized",
        progress: { completed: 20, total: 20 },
      }),
    ];

    render(<ManualSessionTable sessions={sessions} loading={false} />);

    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText("Dibuat")).toBeInTheDocument();
    expect(screen.getByText("Pembuat")).toBeInTheDocument();
    expect(screen.getByText("Produk")).toBeInTheDocument();
    expect(screen.getByText("Kasus")).toBeInTheDocument();
    expect(screen.getByText("Pengulangan")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Progres")).toBeInTheDocument();

    // Sesi 1
    expect(screen.getByText("Sesi 1")).toBeInTheDocument();
    expect(screen.getByText("Belum terisi")).toBeInTheDocument();
    expect(screen.getByText("0 dari 20 jawaban terisi")).toBeInTheDocument();

    // Sesi 2
    expect(screen.getByText("Sesi 2")).toBeInTheDocument();
    expect(screen.getByText("Terisi sebagian")).toBeInTheDocument();
    expect(screen.getByText("10 dari 20 jawaban terisi")).toBeInTheDocument();

    // Sesi 3 (finalized)
    expect(screen.getByText("Sesi 3")).toBeInTheDocument();
    expect(screen.getByText("Selesai")).toBeInTheDocument();
    expect(screen.getByText("20 dari 20 jawaban terisi")).toBeInTheDocument();
    expect(screen.getByText("Lihat detail")).toBeInTheDocument();
  });

  it("does NOT display cost estimates, budget, or failure rate headers (AC10)", () => {
    render(<ManualSessionTable sessions={[]} loading={false} />);

    expect(screen.queryByText(/biaya/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/anggaran/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kegagalan/i)).not.toBeInTheDocument();
  });

  it("renders loading skeletons when loading is true", () => {
    const { container } = render(<ManualSessionTable sessions={[]} loading={true} />);
    expect(container.querySelectorAll(".animate-pulse")).not.toHaveLength(0);
  });
});
