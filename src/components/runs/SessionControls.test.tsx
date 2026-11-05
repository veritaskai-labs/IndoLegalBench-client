import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import { acceptAsIs, clearAcceptAsIs } from "@/lib/runs/sessionControlApi";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";
import { SessionControls } from "./SessionControls";

// sessionControlApi has its own request tests (stubbed fetch); here only the controls' reaction matters.
vi.mock("@/lib/runs/sessionControlApi", () => ({ acceptAsIs: vi.fn(), clearAcceptAsIs: vi.fn() }));

const accept = vi.mocked(acceptAsIs);
const clear = vi.mocked(clearAcceptAsIs);

const ACCEPTED = {
  accepted_as_is_at: "2026-11-05T03:00:00Z",
  accepted_as_is_by: "admin-1",
  accepted_as_is_reason: "Kegagalan dari batas kuota penyedia",
};

type ControlState = Pick<
  SessionDetail,
  "id" | "label" | "status" | "accepted_as_is_at" | "accepted_as_is_by" | "accepted_as_is_reason"
>;

function session(overrides: Partial<ControlState> = {}): ControlState {
  return {
    id: "s-1",
    label: "Run November",
    status: "finished_with_failures",
    accepted_as_is_at: null,
    accepted_as_is_by: null,
    accepted_as_is_reason: null,
    ...overrides,
  };
}

function renderControls(state: ControlState, role: Role | null = "admin") {
  const onChanged = vi.fn();
  render(
    <ToastProvider>
      <SessionControls session={state} role={role} onChanged={onChanged} />
    </ToastProvider>,
  );
  return { onChanged };
}

// The toast provider renders its own region, so check for the controls themselves.
function expectNothingShown() {
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Diterima apa adanya" })).not.toBeInTheDocument();
}

beforeEach(() => {
  accept.mockReset();
  clear.mockReset();
});

describe("SessionControls: Terima apa adanya (PBI-12 AC9)", () => {
  it("lets Admin accept a session that finished with failures, then reloads it", async () => {
    const user = userEvent.setup();
    accept.mockResolvedValue({ id: "s-1", ...ACCEPTED });
    const { onChanged } = renderControls(session());

    await user.click(screen.getByRole("button", { name: "Terima apa adanya" }));
    const dialog = within(screen.getByRole("dialog", { name: "Terima sesi apa adanya?" }));
    await user.type(dialog.getByRole("textbox", { name: "Alasan" }), "Kegagalan dari batas kuota penyedia");
    await user.click(dialog.getByRole("button", { name: "Terima apa adanya" }));

    expect(await screen.findByText("Sesi “Run November” diterima apa adanya")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Negative: the server refused; closing brings the page back in line with the server.
  it("reloads after a refused accept is closed, but not after a plain cancel", async () => {
    const user = userEvent.setup();
    accept.mockRejectedValue(new ApiError(409, "ALREADY_ACCEPTED"));
    const { onChanged } = renderControls(session());

    await user.click(screen.getByRole("button", { name: "Terima apa adanya" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));
    expect(onChanged).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Terima apa adanya" }));
    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByRole("textbox", { name: "Alasan" }), "Alasan");
    await user.click(dialog.getByRole("button", { name: "Terima apa adanya" }));
    await dialog.findByRole("alert");
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it.each<Role>(["developer_ai", "contributor", "viewer"])("offers nothing to %s on a session that is not accepted", (role) => {
    renderControls(session(), role);

    expectNothingShown();
  });

  it("offers nothing on a session that finished without failures", () => {
    renderControls(session({ status: "finished" }));

    expectNothingShown();
  });
});

describe("SessionControls: accepted mark (PBI-12 AC9)", () => {
  it("shows when and why the session was accepted, instead of the accept button", () => {
    renderControls(session(ACCEPTED));

    const mark = within(screen.getByRole("region", { name: "Diterima apa adanya" }));
    expect(mark.getByText("05 Nov 2026, 10.00 WIB")).toBeInTheDocument();
    expect(mark.getByText("Kegagalan dari batas kuota penyedia")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Terima apa adanya" })).not.toBeInTheDocument();
  });

  it("lets Admin remove the mark, then reloads the session", async () => {
    const user = userEvent.setup();
    clear.mockResolvedValue({ id: "s-1", accepted_as_is_at: null, accepted_as_is_by: null, accepted_as_is_reason: null });
    const { onChanged } = renderControls(session(ACCEPTED));

    await user.click(screen.getByRole("button", { name: "Hapus tanda" }));
    await user.click(within(screen.getByRole("dialog", { name: "Hapus tanda terima apa adanya?" })).getByRole("button", { name: "Hapus tanda" }));

    expect(await screen.findByText("Tanda terima apa adanya pada “Run November” dihapus")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  // Negative: Developer AI reads the mark but cannot remove it (server answers 403).
  it("shows the mark to Developer AI without the remove button", () => {
    renderControls(session(ACCEPTED), "developer_ai");

    expect(screen.getByRole("region", { name: "Diterima apa adanya" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus tanda" })).not.toBeInTheDocument();
  });
});
