import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuditEntry } from "@/types/audit";
import { AuditDetailPanel } from "./AuditDetailPanel";

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: "a1",
    occurred_at: "2026-10-06T03:30:00Z",
    actor_user_id: "u1",
    action: "case.updated",
    entity_type: "case",
    entity_id: "ILB-PT-0142",
    before: { title: "Judul lama" },
    after: { title: "Judul baru" },
    reason: "Pasal yang dirujuk sudah dicabut",
    ...overrides,
  };
}

describe("AuditDetailPanel", () => {
  // Positive
  it("shows the value before and after, and the reason", () => {
    render(<AuditDetailPanel entry={entry()} onClose={vi.fn()} />);

    const panel = screen.getByRole("dialog", { name: "Detail catatan audit" });
    expect(panel).toHaveTextContent("Judul lama");
    expect(panel).toHaveTextContent("Judul baru");
    expect(panel).toHaveTextContent("Pasal yang dirujuk sudah dicabut");
  });

  // Corner
  it("says there is nothing recorded when a side is empty", () => {
    render(<AuditDetailPanel entry={entry({ before: null })} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).toHaveTextContent(
      "Tidak ada",
    );
  });

  // Corner
  it("says no reason was given when the actor left it empty", () => {
    render(<AuditDetailPanel entry={entry({ reason: null })} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).toHaveTextContent(
      "Tanpa alasan",
    );
  });

  // Positive
  it("closes when the reader asks to", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AuditDetailPanel entry={entry()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Tutup" }));

    expect(onClose).toHaveBeenCalled();
  });

  // Security: before/after carry text an author typed.
  it("shows markup in a recorded value as plain text", () => {
    const value = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <AuditDetailPanel entry={entry({ after: { title: value } })} onClose={vi.fn()} />,
    );

        expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).toHaveTextContent(
      "img src=x onerror=",
    );
    expect(container.querySelector("img")).toBeNull();
  });
});