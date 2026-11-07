import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FinalizeSessionDialog } from "./FinalizeSessionDialog";

vi.mock("@/lib/runs/manualRunsApi", () => ({
  finalizeManualSession: vi.fn(),
  manualErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

import { finalizeManualSession } from "@/lib/runs/manualRunsApi";

const mockFinalize = vi.mocked(finalizeManualSession);

describe("FinalizeSessionDialog (PBI-22 AC8)", () => {
  it("renders confirmation dialog with irrevocable warning", () => {
    render(
      <FinalizeSessionDialog
        sessionId="session-123"
        sessionLabel="LegalHero Test"
        onFinalized={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Tandai Selesai Pengukuran Manual" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/LegalHero Test/)).toBeInTheDocument();
    expect(screen.getByText(/tidak dapat dibuka kembali/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tandai Selesai" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Batal" })).toBeInTheDocument();
  });

  it("calls onClose when Batal is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <FinalizeSessionDialog
        sessionId="session-123"
        sessionLabel="LegalHero Test"
        onFinalized={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("calls finalizeManualSession and onFinalized when confirmed", async () => {
    const user = userEvent.setup();
    const onFinalized = vi.fn();
    mockFinalize.mockResolvedValueOnce({
      id: "session-123",
      status: "finalized",
      finalized_at: "2026-11-08T00:00:00Z",
      finalized_by: "u-admin",
    });

    render(
      <FinalizeSessionDialog
        sessionId="session-123"
        sessionLabel="LegalHero Test"
        onFinalized={onFinalized}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tandai Selesai" }));

    expect(mockFinalize).toHaveBeenCalledWith("session-123");
    await waitFor(() => {
      expect(onFinalized).toHaveBeenCalledWith({
        id: "session-123",
        status: "finalized",
        finalized_at: "2026-11-08T00:00:00Z",
        finalized_by: "u-admin",
      });
    });
  });
});
