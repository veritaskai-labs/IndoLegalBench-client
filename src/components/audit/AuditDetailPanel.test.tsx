import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuditEntry } from "@/types/audit";
import { AuditDetailPanel } from "./AuditDetailPanel";

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    occurred_at: "2026-10-06T03:30:00Z",
    actor_user_id: "u1",
    actor_name: "Herdayani",
    actor_email: "herdayani@veritask.test",
    actor_role: "author",
    action: "case.updated",
    entity_type: "case",
    entity_id: "ILB-PT-0142",
    case_id: "ILB-PT-0142",
    before: { title: "Judul lama" },
    after: { title: "Judul baru" },
    reason: "Pasal yang dirujuk sudah dicabut",
    request_id: null,
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

  // Positive: F-06
  it("titles the panel with the Indonesian action and keeps the code for reference", () => {
    render(<AuditDetailPanel entry={entry()} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Kasus diubah" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).toHaveTextContent(
      "case.updated",
    );
  });

  // Negative
  it("titles the panel with the raw code for an action it does not know", () => {
    render(<AuditDetailPanel entry={entry({ action: "measurement.started" })} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "measurement.started" })).toBeInTheDocument();
  });

  // Positive: F-06
  it("shows the readable object name next to its id", () => {
    render(
      <AuditDetailPanel
        entry={entry({ entity_id: "7bc7f6f3-uuid", entity_label: "UAT-PHK-001" })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).toHaveTextContent(
      "Kasus UAT-PHK-001 · 7bc7f6f3-uuid",
    );
  });

  it("shows the actor name, not the id", () => {
    render(<AuditDetailPanel entry={entry()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).toHaveTextContent(
      "Herdayani",
    );
  });

  // Positive: the email is unique, so the detail can be trusted to name one person.
  it("shows the actor's email with the name", () => {
    render(<AuditDetailPanel entry={entry()} onClose={vi.fn()} />);

    const panel = screen.getByRole("dialog", { name: "Detail catatan audit" });
    expect(panel).toHaveTextContent("herdayani@veritask.test (Herdayani)");
  });

  // Corner
  it("shows only the name when the actor has no email", () => {
    render(<AuditDetailPanel entry={entry({ actor_email: null })} onClose={vi.fn()} />);

    const panel = screen.getByRole("dialog", { name: "Detail catatan audit" });
    expect(panel).toHaveTextContent("Herdayani");
    expect(panel).not.toHaveTextContent("@");
  });

  // Positive: SCRUM-178, the detail must not sit under the table where it is missed.
  it("opens as a modal dialog outside the place it was rendered from", () => {
    const { container } = render(<AuditDetailPanel entry={entry()} onClose={vi.fn()} />);

    const panel = screen.getByRole("dialog", { name: "Detail catatan audit" });
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(container).not.toContainElement(panel);
  });

  // Positive
  it("puts the focus on the close button when it opens", () => {
    render(<AuditDetailPanel entry={entry()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Tutup" })).toHaveFocus();
  });

  // Positive
  it("closes with the Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AuditDetailPanel entry={entry()} onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Positive
  it("closes when the reader clicks the dimmed area around it", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AuditDetailPanel entry={entry()} onClose={onClose} />);

    await user.click(screen.getByTestId("audit-detail-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Negative: reading or selecting text inside the dialog must not throw it away.
  it("stays open when the reader clicks inside it", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AuditDetailPanel entry={entry()} onClose={onClose} />);

    await user.click(screen.getByRole("heading", { name: "Kasus diubah" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  // Corner: other keys are not a request to close.
  it("ignores other keys", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AuditDetailPanel entry={entry()} onClose={onClose} />);

    await user.keyboard("a{ArrowDown}");

    expect(onClose).not.toHaveBeenCalled();
  });

  // Corner
  it("says the system did it when there is no actor", () => {
    render(
      <AuditDetailPanel
        entry={entry({ actor_user_id: null, actor_name: null, actor_email: null })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).toHaveTextContent(
      "Sistem",
    );
  });
});


describe("K-03 history discussion access", () => {
  it("links an author-reply event to the exact assignment even after the latest round changes", () => {
    render(<AuditDetailPanel entry={entry({ action: "review.comment_replied", entity_type: "review", entity_id: "a/b" })} onClose={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Buka diskusi komentar" });
    expect(link).toHaveAttribute("href", "/reviews/a%2Fb/discussion");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
  it.each([
    { action: "case.updated", entity_type: "review" as const },
    { action: "review.comment_replied", entity_type: "case" as const },
  ])("does not invent a discussion for unrelated events (%s)", (overrides) => {
    render(<AuditDetailPanel entry={entry(overrides)} onClose={vi.fn()} />);
    expect(screen.queryByRole("link", { name: "Buka diskusi komentar" })).not.toBeInTheDocument();
  });
});

// SCRUM-178 review: the detail must behave as a real modal for the keyboard.
describe("keyboard containment while the detail is open", () => {
  const replyEntry = () =>
    entry({ action: "review.comment_replied", entity_type: "review", entity_id: "r1" });

  function renderOverBackground(panelEntry: AuditEntry) {
    const background = render(<button type="button">Tombol latar</button>);
    const opener = screen.getByRole("button", { name: "Tombol latar" });
    opener.focus();
    const panel = render(<AuditDetailPanel entry={panelEntry} onClose={vi.fn()} />);
    return { background, panel, opener };
  }

  // Negative: Tab must not reach the page behind.
  it("keeps Tab on the close button when it is the only control", async () => {
    // Arrange
    const user = userEvent.setup();
    renderOverBackground(entry());

    // Act
    await user.tab();

    // Assert
    expect(screen.getByRole("button", { name: "Tutup" })).toHaveFocus();
  });

  // Negative: the reported case, Shift+Tab from Tutup reached a background button.
  it("keeps Shift+Tab on the close button when it is the only control", async () => {
    // Arrange
    const user = userEvent.setup();
    renderOverBackground(entry());

    // Act
    await user.tab({ shift: true });

    // Assert
    expect(screen.getByRole("button", { name: "Tutup" })).toHaveFocus();
  });

  // Positive
  it("cycles Tab between the close button and the discussion link", async () => {
    // Arrange
    const user = userEvent.setup();
    renderOverBackground(replyEntry());
    const close = screen.getByRole("button", { name: "Tutup" });
    const link = screen.getByRole("link", { name: "Buka diskusi komentar" });

    // Act / Assert
    await user.tab();
    expect(link).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });

  // Positive
  it("cycles Shift+Tab from the close button back to the discussion link", async () => {
    // Arrange
    const user = userEvent.setup();
    renderOverBackground(replyEntry());

    // Act
    await user.tab({ shift: true });

    // Assert
    expect(screen.getByRole("link", { name: "Buka diskusi komentar" })).toHaveFocus();
  });

  // Positive: assistive tech and the pointer must not reach the page behind either.
  it("makes the page behind inert while open and live again after closing", () => {
    // Arrange
    const { background, panel } = renderOverBackground(entry());

    // Assert (open)
    expect(background.container).toHaveAttribute("inert");

    // Act
    panel.unmount();

    // Assert (closed)
    expect(background.container).not.toHaveAttribute("inert");
  });

  // Edge: the dialog's own portal must never be made inert.
  it("does not make the dialog itself inert", () => {
    // Arrange / Act
    renderOverBackground(entry());

    // Assert
    expect(screen.getByRole("dialog", { name: "Detail catatan audit" })).not.toHaveAttribute(
      "inert",
    );
    expect(screen.getByRole("dialog").closest("[inert]")).toBeNull();
  });

  // Positive: guards the existing behaviour while the focus handling changes.
  it("returns focus to the element that opened it", () => {
    // Arrange
    const { panel, opener } = renderOverBackground(entry());

    // Act
    panel.unmount();

    // Assert
    expect(opener).toHaveFocus();
  });
});

// SCRUM-178 review: a long actor email must not push the header wider than the dialog.
// jsdom has no layout, so these pin the classes that stop the overflow; the real width
// is checked in the browser at 320px.
describe("long content inside the detail", () => {
  const longEmail = "pengguna.sintetis.dengan.alamat.email.yang.panjang@departemen.hukum.contoh.test";
  const longEntry = () => entry({ actor_email: longEmail, before: { catatan: "a".repeat(200) } });

  // Positive
  it("lets the title column shrink so the header stays inside the dialog", () => {
    // Arrange / Act
    render(<AuditDetailPanel entry={longEntry()} onClose={vi.fn()} />);

    // Assert
    const column = screen.getByRole("heading", { name: "Kasus diubah" }).parentElement;
    expect(column).toHaveClass("min-w-0");
  });

  // Positive
  it("wraps the long email instead of stretching the line", () => {
    // Arrange / Act
    render(<AuditDetailPanel entry={longEntry()} onClose={vi.fn()} />);

    // Assert
    expect(screen.getByText(new RegExp(longEmail))).toHaveClass("break-words");
  });

  // Negative: the close button must stay reachable and keep its size.
  it("keeps the close button from shrinking", () => {
    // Arrange / Act
    render(<AuditDetailPanel entry={longEntry()} onClose={vi.fn()} />);

    // Assert
    expect(screen.getByRole("button", { name: "Tutup" })).toHaveClass("shrink-0");
  });

  // Edge: a long recorded value wraps instead of scrolling sideways.
  it("wraps a long recorded value and lets its column shrink", () => {
    // Arrange / Act
    render(<AuditDetailPanel entry={longEntry()} onClose={vi.fn()} />);

    // Assert
    const value = screen.getByText(/a{200}/);
    expect(value).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(value.parentElement).toHaveClass("min-w-0");
  });
});
