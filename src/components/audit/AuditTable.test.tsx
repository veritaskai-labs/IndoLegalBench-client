import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuditEntry } from "@/types/audit";
import { AuditTable } from "./AuditTable";

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
    entity_id: "c1",
    case_id: "c1",
    before: null,
    after: null,
    reason: null,
    request_id: null,
    ...overrides,
  };
}

describe("AuditTable", () => {
  // Positive
  it("shows the time in WIB, the actor, the action, and the object", () => {
    render(<AuditTable entries={[entry()]} onRowClick={vi.fn()} />);

    const row = screen.getByRole("row", { name: /Kasus diubah/ });
    expect(row).toHaveTextContent("6 Okt 2026, 10:30 WIB");
    expect(row).toHaveTextContent("Herdayani");
    expect(row).toHaveTextContent("Kasus");
    expect(row).toHaveTextContent("c1");
  });

  // Positive: F-06, readers outside the team cannot read system codes.
  it("shows the action in Indonesian instead of the system code", () => {
    render(<AuditTable entries={[entry({ action: "case.submitted" })]} onRowClick={vi.fn()} />);

    const row = screen.getByRole("row", { name: /Kasus diajukan review/ });
    expect(row).not.toHaveTextContent("case.submitted");
  });

  // Negative
  it("shows the raw code for an action it does not know", () => {
    render(
      <AuditTable entries={[entry({ action: "measurement.started" })]} onRowClick={vi.fn()} />,
    );

    expect(screen.getByRole("row", { name: /measurement\.started/ })).toBeInTheDocument();
  });

  // Positive: F-06
  it("shows the readable object name instead of the id", () => {
    render(
      <AuditTable
        entries={[entry({ entity_id: "7bc7f6f3-uuid", entity_label: "UAT-PHK-001" })]}
        onRowClick={vi.fn()}
      />,
    );

    const row = screen.getByRole("row", { name: /Kasus diubah/ });
    expect(row).toHaveTextContent("Kasus UAT-PHK-001");
    expect(row).not.toHaveTextContent("7bc7f6f3-uuid");
  });

  // Negative: the object is gone, so the id is all there is.
  it("falls back to the id when there is no readable name", () => {
    render(
      <AuditTable
        entries={[entry({ entity_id: "7bc7f6f3-uuid", entity_label: null })]}
        onRowClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("row", { name: /Kasus diubah/ })).toHaveTextContent(
      "Kasus 7bc7f6f3-uuid",
    );
  });

  // Corner: a server without the field yet.
  it("falls back to the id when the server does not send a name", () => {
    render(<AuditTable entries={[entry({ entity_id: "7bc7f6f3-uuid" })]} onRowClick={vi.fn()} />);

    expect(screen.getByRole("row", { name: /Kasus diubah/ })).toHaveTextContent("7bc7f6f3-uuid");
  });

  // Security: suite names are typed by users.
  it("shows markup in the object name as plain text", () => {
    const name = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <AuditTable entries={[entry({ entity_label: name })]} onRowClick={vi.fn()} />,
    );

    expect(screen.getByRole("row", { name: /Kasus diubah/ })).toHaveTextContent(name);
    expect(container.querySelector("img")).toBeNull();
  });

  // Positive
  it("hands the whole entry back when a row is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const only = entry();
    render(<AuditTable entries={[only]} onRowClick={onRowClick} />);

    await user.click(screen.getByRole("row", { name: /Kasus diubah/ }));

    expect(onRowClick).toHaveBeenCalledWith(only);
  });

  // Positive: AC3, the email is unique so it is what tells actors apart.
  it("shows the actor's email as the main text of the Pelaku cell", () => {
    render(<AuditTable entries={[entry()]} onRowClick={vi.fn()} />);

    const row = screen.getByRole("row", { name: /Kasus diubah/ });
    const pelaku = within(row).getAllByRole("cell")[1];
    expect(pelaku).toHaveTextContent("herdayani@veritask.test");
    expect(pelaku).toHaveTextContent("Herdayani");
  });

  // Positive: the reason for this change, two people with one name.
  it("tells apart two actors who share a name", () => {
    render(
      <AuditTable
        entries={[
          entry({
            id: 1,
            actor_user_id: "u1",
            actor_name: "Rina Sari",
            actor_email: "rina.a@veritask.ai",
          }),
          entry({
            id: 2,
            actor_user_id: "u2",
            actor_name: "Rina Sari",
            actor_email: "rina.b@veritask.ai",
          }),
        ]}
        onRowClick={vi.fn()}
      />,
    );

    const [, first, second] = screen.getAllByRole("row");
    expect(within(first).getAllByRole("cell")[1]).toHaveTextContent("rina.a@veritask.ai");
    expect(within(second).getAllByRole("cell")[1]).toHaveTextContent("rina.b@veritask.ai");
  });

  // Corner: a server without the field yet, or an actor whose email is missing.
  it("shows the name when the actor has no email", () => {
    render(<AuditTable entries={[entry({ actor_email: null })]} onRowClick={vi.fn()} />);

    const row = screen.getByRole("row", { name: /Kasus diubah/ });
    const pelaku = within(row).getAllByRole("cell")[1];
    expect(pelaku).toHaveTextContent("Herdayani");
    expect(pelaku).not.toHaveTextContent("@");
  });

  // Security: an email is data from the user table, so it is text, not markup.
  it("shows markup in the actor's email as plain text", () => {
    const email = '<img src=x onerror="alert(1)">@veritask.ai';
    const { container } = render(
      <AuditTable entries={[entry({ actor_email: email })]} onRowClick={vi.fn()} />,
    );

    expect(screen.getByRole("row", { name: /Kasus diubah/ })).toHaveTextContent(email);
    expect(container.querySelector("img")).toBeNull();
  });

  // Corner
  it("falls back to the raw type when the server sends one it does not know", () => {
    render(
      <AuditTable
        entries={[entry({ entity_type: "measurement_session" as AuditEntry["entity_type"] })]}
        onRowClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("row", { name: /Kasus diubah/ })).toHaveTextContent(
      "measurement_session",
    );
  });

  // Security: the object label comes from data an author typed.
  it("shows markup in the object id as plain text", () => {
    const id = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <AuditTable entries={[entry({ entity_id: id })]} onRowClick={vi.fn()} />,
    );

    expect(screen.getByRole("row", { name: /Kasus diubah/ })).toHaveTextContent(id);
    expect(container.querySelector("img")).toBeNull();
  });

  // Corner
  it("renders nothing but the head when there are no entries", () => {
    render(<AuditTable entries={[]} onRowClick={vi.fn()} />);

    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
  
  it("says the system did it when there is no actor", () => {
    render(
    <AuditTable
    entries={[entry({ actor_user_id: null, actor_name: null, actor_email: null })]}
    onRowClick={vi.fn()}
    />,
  );
  expect(screen.getByRole("row", { name: /Kasus diubah/ })).toHaveTextContent("Sistem");
  });
});