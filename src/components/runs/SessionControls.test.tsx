import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import {
  acceptAsIs,
  cancelSession,
  clearAcceptAsIs,
  pauseSession,
  resumeSession,
  retrySession,
} from "@/lib/runs/sessionControlApi";
import type { Role } from "@/types";
import type { AttemptStatus, SessionCaseResult, SessionDetail } from "@/types/measurement";
import { SessionControls } from "./SessionControls";

// sessionControlApi has its own request tests (stubbed fetch); here only the controls' reaction matters.
vi.mock("@/lib/runs/sessionControlApi", () => ({
  acceptAsIs: vi.fn(),
  clearAcceptAsIs: vi.fn(),
  pauseSession: vi.fn(),
  cancelSession: vi.fn(),
  resumeSession: vi.fn(),
  retrySession: vi.fn(),
}));

const accept = vi.mocked(acceptAsIs);
const clear = vi.mocked(clearAcceptAsIs);
const pause = vi.mocked(pauseSession);
const cancel = vi.mocked(cancelSession);
const resume = vi.mocked(resumeSession);
const retry = vi.mocked(retrySession);

const ACCEPTED = {
  accepted_as_is_at: "2026-11-05T03:00:00Z",
  accepted_as_is_by: "admin-1",
  accepted_as_is_reason: "Kegagalan dari batas kuota penyedia",
};

type ControlState = Pick<
  SessionDetail,
  | "id"
  | "label"
  | "status"
  | "progress"
  | "archived_at"
  | "accepted_as_is_at"
  | "accepted_as_is_by"
  | "accepted_as_is_reason"
  | "resumed_after_long_pause"
  | "model_version_unverified"
  | "resume_error_code"
  | "created_by"
> & { cases: Pick<SessionCaseResult, "snapshot_item_id" | "case_code" | "title" | "masked" | "attempts">[] };

function session(overrides: Partial<ControlState> = {}): ControlState {
  return {
    id: "s-1",
    label: "Run November",
    status: "finished_with_failures",
    progress: { completed: 240, total: 300 },
    archived_at: null,
    accepted_as_is_at: null,
    accepted_as_is_by: null,
    accepted_as_is_reason: null,
    resumed_after_long_pause: false,
    model_version_unverified: false,
    resume_error_code: null,
    // Not the signed-in user and no failed attempt: retry stays out of the older tests.
    created_by: "someone-else",
    cases: [],
    ...overrides,
  };
}

function renderControls(state: ControlState, role: Role | null = "admin", viewerId: string | null = "u-1") {
  const onChanged = vi.fn();
  render(
    <ToastProvider>
      <SessionControls session={state} role={role} viewerId={viewerId} onChanged={onChanged} />
    </ToastProvider>,
  );
  return { onChanged };
}

// The toast provider renders its own region, so collect the controls themselves. The test asserts
// on the list (Sonar S2699 only counts expect() written in the test), and a failure names what showed up.
function shownControls(): string[] {
  const buttons = screen.queryAllByRole("button").map((button) => button.textContent ?? "");
  const mark = screen.queryByRole("region", { name: "Diterima apa adanya" }) ? ["Diterima apa adanya"] : [];
  return [...buttons, ...mark];
}

beforeEach(() => {
  for (const mock of [accept, clear, pause, cancel, resume, retry]) mock.mockReset();
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

    expect(shownControls()).toEqual([]);
  });

  it("offers nothing on a session that finished without failures", () => {
    renderControls(session({ status: "finished" }));

    expect(shownControls()).toEqual([]);
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

const stopped = { id: "s-1", stopped_at: "2026-11-05T03:00:00Z", stop_reason: "user" as const };
const resumed = { id: "s-1", status: "running" as const, resumed_after_long_pause: false, model_version_unverified: false };

describe("SessionControls: Jeda, Batalkan, Lanjutkan (PBI-12 AC7, AC8)", () => {
  it("offers Jeda and Batalkan to Admin on a running session, not Lanjutkan", () => {
    renderControls(session({ status: "running" }));

    expect(screen.getByRole("button", { name: "Jeda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Batalkan" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lanjutkan" })).not.toBeInTheDocument();
  });

  it("pauses at once, says so and reloads", async () => {
    const user = userEvent.setup();
    pause.mockResolvedValue({ ...stopped, status: "paused" });
    const { onChanged } = renderControls(session({ status: "running" }));

    await user.click(screen.getByRole("button", { name: "Jeda" }));

    expect(pause).toHaveBeenCalledWith("s-1");
    expect(await screen.findByText("Sesi “Run November” dijeda")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  // Corner: a double click must not send two requests.
  it("sends one pause when Jeda is clicked twice", async () => {
    const user = userEvent.setup();
    pause.mockReturnValue(new Promise(() => undefined));
    renderControls(session({ status: "running" }));

    await user.click(screen.getByRole("button", { name: "Jeda" }));
    await user.click(screen.getByRole("button", { name: "Jeda" }));

    expect(pause).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Batalkan" })).toBeDisabled();
  });

  // Negative: the reason stays on screen; a reload would wipe it, so the page is not reloaded.
  it("shows why a pause was refused without reloading", async () => {
    const user = userEvent.setup();
    pause.mockRejectedValue(new ApiError(409, "INVALID_TRANSITION"));
    const { onChanged } = renderControls(session({ status: "running" }));

    await user.click(screen.getByRole("button", { name: "Jeda" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Status sesi sudah berubah. Muat ulang halaman.");
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("cancels after the AC7 confirmation and reloads", async () => {
    const user = userEvent.setup();
    cancel.mockResolvedValue({ ...stopped, status: "cancelled" });
    const { onChanged } = renderControls(session({ status: "paused" }));

    await user.click(screen.getByRole("button", { name: "Batalkan" }));
    const dialog = within(screen.getByRole("dialog", { name: "Batalkan sesi?" }));
    expect(dialog.getByText(/240 dari 300/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Batalkan sesi" }));

    expect(await screen.findByText("Sesi “Run November” dibatalkan")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it.each(["paused", "cancelled"] as const)("resumes a %s session, says so and reloads", async (status) => {
    const user = userEvent.setup();
    resume.mockResolvedValue(resumed);
    const { onChanged } = renderControls(session({ status }));

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(resume).toHaveBeenCalledWith("s-1");
    expect(await screen.findByText("Sesi “Run November” dilanjutkan")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  // server#102: no version was ever reported, so Admin confirms before the resume goes through.
  it("asks Admin to confirm an unverified model version, then resumes with that confirmation", async () => {
    const user = userEvent.setup();
    resume.mockRejectedValueOnce(new ApiError(409, "MODEL_VERSION_CONFIRMATION_REQUIRED")).mockResolvedValueOnce({
      ...resumed,
      model_version_unverified: true,
    });
    const { onChanged } = renderControls(session({ status: "paused" }));

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Lanjutkan tanpa versi model terverifikasi?" }));
    await user.click(dialog.getByRole("button", { name: "Tetap lanjutkan" }));

    expect(resume).toHaveBeenLastCalledWith("s-1", { confirmUnverifiedVersion: true });
    expect(await screen.findByText("Sesi “Run November” dilanjutkan")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Negative (AC8): the version moved on; the session cannot go on.
  it("explains a changed model version on resume", async () => {
    const user = userEvent.setup();
    resume.mockRejectedValue(new ApiError(409, "MODEL_VERSION_CHANGED"));
    renderControls(session({ status: "paused" }));

    await user.click(screen.getByRole("button", { name: "Lanjutkan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Versi model produk sudah berbeda dari saat sesi dimulai. Buat sesi baru untuk mengukur lagi.",
    );
  });

  // Negative: server#102 default gives the controls to Admin only.
  it("offers no control to Developer AI", () => {
    renderControls(session({ status: "running" }), "developer_ai");

    expect(shownControls()).toEqual([]);
  });
});

describe("SessionControls: resume markers (PBI-12 AC8)", () => {
  it("marks a session resumed after a long pause, for every reader", () => {
    renderControls(session({ status: "running", resumed_after_long_pause: true }), "developer_ai");

    expect(screen.getByText(/Dilanjutkan setelah jeda panjang/)).toBeInTheDocument();
  });

  it("marks a session resumed without a verified model version", () => {
    renderControls(session({ status: "finished", model_version_unverified: true }), "developer_ai");

    expect(screen.getByText(/Versi model belum terverifikasi/)).toBeInTheDocument();
  });

  // AC8: once the version changed, the only way forward is a new session.
  it("says the version changed and points to a new session instead of Lanjutkan", () => {
    renderControls(session({ status: "paused", resume_error_code: "MODEL_VERSION_CHANGED" }));

    expect(screen.getByText(/Versi model produk berubah setelah sesi dilanjutkan/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buat sesi baru" })).toHaveAttribute("href", "/runs/new");
    expect(screen.queryByRole("button", { name: "Lanjutkan" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Batalkan" })).toBeInTheDocument();
  });
});

function failedCase(key: string, statuses: AttemptStatus[]) {
  return {
    snapshot_item_id: key,
    case_code: `QA-${key}`,
    title: `Kasus sintetis ${key}`,
    masked: false,
    attempts: statuses.map((status, index) => ({
      id: `${key}-a${index + 1}`,
      repetition_no: index + 1,
      status,
      answer_text: null,
      model_version: null,
    })),
  };
}

const withFailures = { cases: [failedCase("1", ["succeeded", "technical_failure"]), failedCase("2", ["succeeded", "succeeded"])] };

describe("SessionControls: Coba ulang yang gagal (PBI-12 AC3)", () => {
  it("lets Admin retry the failed attempts, says so and reloads", async () => {
    const user = userEvent.setup();
    retry.mockResolvedValue({ id: "s-1", status: "running", retried_attempt_ids: ["1-a2"] });
    const { onChanged } = renderControls(session(withFailures));

    await user.click(screen.getByRole("button", { name: "Coba ulang yang gagal" }));
    const dialog = within(screen.getByRole("dialog", { name: "Coba ulang yang gagal?" }));
    expect(dialog.getByRole("checkbox", { name: "QA-1 · Kasus sintetis 1 (1 gagal)" })).toBeChecked();
    expect(dialog.queryByRole("checkbox", { name: /QA-2/ })).not.toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Coba ulang" }));

    expect(retry).toHaveBeenCalledWith("s-1", { allFailed: true });
    expect(await screen.findByText("Percobaan yang gagal pada “Run November” dicoba ulang")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  // server#99: Developer AI retries its own session, but gets neither accept nor the other controls.
  it("offers retry to Developer AI on its own session only", () => {
    renderControls(session({ ...withFailures, created_by: "dev-1" }), "developer_ai", "dev-1");

    expect(screen.getByRole("button", { name: "Coba ulang yang gagal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Terima apa adanya" })).not.toBeInTheDocument();
  });

  // Negative: 403 NOT_YOUR_SESSION.
  it("does not offer retry to Developer AI on someone else's session", () => {
    renderControls(session(withFailures), "developer_ai", "dev-1");

    expect(shownControls()).toEqual([]);
  });

  // Negative: 409 SESSION_ACCEPTED while the mark is on.
  it("does not offer retry while the session is accepted as-is", () => {
    renderControls(session({ ...withFailures, ...ACCEPTED }));

    expect(screen.queryByRole("button", { name: "Coba ulang yang gagal" })).not.toBeInTheDocument();
  });
});
