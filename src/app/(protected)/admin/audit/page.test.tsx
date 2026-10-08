import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditLogs } from "@/lib/audit/auditApi";
import type { AuditEntry, AuditPage } from "@/types/audit";
import AuditPageComponent from "./page";

vi.mock("@/lib/audit/auditApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit/auditApi")>();
  return { ...actual, listAuditLogs: vi.fn() };
});
const list = vi.mocked(listAuditLogs);

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    occurred_at: "2026-10-06T03:30:00Z",
    actor_user_id: "u1",
    actor_name: "Herdayani",
    actor_role: "author",
    action: "case.updated",
    entity_type: "case",
    entity_id: "ILB-PT-0142",
    case_id: "ILB-PT-0142",
    before: { title: "Judul lama" },
    after: { title: "Judul baru" },
    reason: "Pasal dicabut",
    request_id: null,
    ...overrides,
  };
}

function page(items: AuditEntry[], total = items.length): AuditPage {
  return { items, total, page: 1, size: 20 };
}

beforeEach(() => {
  list.mockReset();
});

describe("AuditPage (SCRUM-141)", () => {
  // Positive
  it("shows a skeleton while the first page is loading", () => {
    list.mockReturnValue(new Promise(() => undefined));
    render(<AuditPageComponent />);

    expect(screen.getByRole("status", { name: "" })).toBeInTheDocument();
  });

  // Positive
  it("lists the entries it received", async () => {
    list.mockResolvedValue(page([entry()]));
    render(<AuditPageComponent />);

    expect(await screen.findByText("ILB-PT-0142")).toBeInTheDocument();
  });

  // Positive
  it("tells the reader that records are kept for 90 days", async () => {
    list.mockResolvedValue(page([]));
    render(<AuditPageComponent />);

    expect(
      await screen.findByText(/Catatan disimpan 90 hari, lalu dihapus otomatis/),
    ).toBeInTheDocument();
  });

  // Positive
  it("opens the detail panel when a row is clicked", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(page([entry()]));
    render(<AuditPageComponent />);
    await screen.findByText("ILB-PT-0142");

    await user.click(screen.getByRole("row", { name: /case.updated/ }));

    const panel = await screen.findByRole("dialog", { name: "Detail catatan audit" });
    expect(panel).toHaveTextContent("Judul lama");
  });

  // Positive
  it("asks again with the chosen entity type", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(page([]));
    render(<AuditPageComponent />);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText("Jenis data"), "suite");

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ entity_type: "suite" })),
    );
  });

  // Positive
  it("asks for the next page", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(page([entry()], 45));
    render(<AuditPageComponent />);
    await screen.findByText("ILB-PT-0142");

    await user.click(screen.getByRole("button", { name: "Berikutnya" }));

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  // Positive
  it("offers both downloads for what is on screen", async () => {
    list.mockResolvedValue(page([entry()]));
    render(<AuditPageComponent />);
    await screen.findByText("ILB-PT-0142");

    expect(screen.getByRole("link", { name: "Unduh CSV" })).toHaveAttribute(
      "href",
      expect.stringContaining("format=csv"),
    );
    expect(screen.getByRole("link", { name: "Unduh PDF" })).toHaveAttribute(
      "href",
      expect.stringContaining("format=pdf"),
    );
  });

  // Corner
  it("says there is nothing to show when the filter matches no record", async () => {
    list.mockResolvedValue(page([]));
    render(<AuditPageComponent />);

    expect(await screen.findByText("Tidak ada catatan audit")).toBeInTheDocument();
  });

  // Negative
  it("shows an error with a retry, and loads again when the reader retries", async () => {
    const user = userEvent.setup();
    list.mockRejectedValueOnce(new Error("boom"));
    render(<AuditPageComponent />);
    await screen.findByRole("alert");

    list.mockResolvedValueOnce(page([entry()]));
    await user.click(screen.getByRole("button", { name: /coba lagi/i }));

    expect(await screen.findByText("ILB-PT-0142")).toBeInTheDocument();
  });
});