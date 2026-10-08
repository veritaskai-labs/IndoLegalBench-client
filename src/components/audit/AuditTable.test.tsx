import { render, screen } from "@testing-library/react";
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

    const row = screen.getByRole("row", { name: /case.updated/ });
    expect(row).toHaveTextContent("6 Okt 2026, 10:30 WIB");
    expect(row).toHaveTextContent("Herdayani");
    expect(row).toHaveTextContent("Kasus");
    expect(row).toHaveTextContent("c1");
  });

  // Positive
  it("hands the whole entry back when a row is clicked", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const only = entry();
    render(<AuditTable entries={[only]} onRowClick={onRowClick} />);

    await user.click(screen.getByRole("row", { name: /case.updated/ }));

    expect(onRowClick).toHaveBeenCalledWith(only);
  });

  // Corner
  it("falls back to the raw type when the server sends one it does not know", () => {
    render(
      <AuditTable
        entries={[entry({ entity_type: "measurement_session" as AuditEntry["entity_type"] })]}
        onRowClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("row", { name: /case.updated/ })).toHaveTextContent(
      "measurement_session",
    );
  });

  // Security: the object label comes from data an author typed.
  it("shows markup in the object id as plain text", () => {
    const id = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <AuditTable entries={[entry({ entity_id: id })]} onRowClick={vi.fn()} />,
    );

    expect(screen.getByRole("row", { name: /case.updated/ })).toHaveTextContent(id);
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
    entries={[entry({ actor_user_id: null, actor_name: null })]}
    onRowClick={vi.fn()}
    />,
  );
  expect(screen.getByRole("row", { name: /case.updated/ })).toHaveTextContent("Sistem");
  });
});