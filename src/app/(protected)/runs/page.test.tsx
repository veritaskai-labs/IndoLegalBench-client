import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import { archiveSession, listSessions } from "@/lib/runs/runsApi";
import type { Role } from "@/types";
import type { SessionArchiveResponse, SessionListItem } from "@/types/measurement";
import RunsPage from "./page";

// runsApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/runs/runsApi", () => ({ listSessions: vi.fn(), archiveSession: vi.fn() }));

const useAuthMock = vi.hoisted(() => vi.fn());
// The page reads the role and the user id to decide who sees Arsipkan (D10).
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

const list = vi.mocked(listSessions);
const archive = vi.mocked(archiveSession);

function signedInAs(role: Role, id = "admin-1") {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { id, name: "Uji", email: "u@veritask.test", role },
  });
}

function session(overrides: Partial<SessionListItem> = {}): SessionListItem {
  return {
    id: "s-1",
    label: "Uji Coba DeepSeek",
    created_at: "2026-11-03T02:00:00Z",
    created_by: "dev-1",
    created_by_name: "Uji Developer AI",
    product_id: "p-1",
    product_name: "DeepSeek",
    case_count: 20,
    repetitions: 3,
    status: "finished",
    progress: { completed: 60, total: 60 },
    ...overrides,
  };
}

const archived: SessionArchiveResponse = { id: "s-1", archived_at: "2026-11-03T03:00:00Z", archived_by: "admin-1" };

function renderPage() {
  return render(
    <ToastProvider>
      <RunsPage />
    </ToastProvider>,
  );
}

async function row(label: string) {
  return (await screen.findByRole("cell", { name: label })).closest("tr") as HTMLElement;
}

beforeEach(() => {
  list.mockReset();
  archive.mockReset();
  signedInAs("admin");
});

describe("RunsPage session list (PBI-11 AC10)", () => {
  it("shows the AC10 columns in the header", async () => {
    list.mockResolvedValue([session()]);
    renderPage();
    await row("Uji Coba DeepSeek");

    for (const name of ["Label", "Dibuat", "Pembuat", "Produk", "Kasus", "Pengulangan", "Status", "Progres"]) {
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
    }
  });

  // Positive: every column of one row.
  it("shows label, creation time in WIB, creator, product, cases, repetitions, status and progress", async () => {
    list.mockResolvedValue([session({ status: "running", progress: { completed: 12, total: 60 } })]);
    renderPage();
    const cells = within(await row("Uji Coba DeepSeek"));

    expect(cells.getByText("03 Nov 2026, 09.00 WIB")).toBeInTheDocument();
    expect(cells.getByText("Uji Developer AI")).toBeInTheDocument();
    expect(cells.getByText("DeepSeek")).toBeInTheDocument();
    expect(cells.getByRole("cell", { name: "20" })).toBeInTheDocument();
    expect(cells.getByRole("cell", { name: "3" })).toBeInTheDocument();
    expect(cells.getByText("Berjalan")).toBeInTheDocument();
    expect(cells.getByText("12 dari 60")).toBeInTheDocument();
  });

  // Edge: queued session, deleted account and product.
  it("shows a queued session without a snapshot and with missing names", async () => {
    list.mockResolvedValue([
      session({
        status: "queued",
        case_count: null,
        created_by_name: null,
        product_name: null,
        progress: { completed: 0, total: 0 },
      }),
    ]);
    renderPage();
    const cells = within(await row("Uji Coba DeepSeek"));

    expect(cells.getByText("Menunggu")).toBeInTheDocument();
    expect(cells.getByText("Menunggu antrean")).toBeInTheDocument();
    expect(cells.getByRole("cell", { name: "–" })).toBeInTheDocument();
    expect(cells.getAllByText("Tidak diketahui")).toHaveLength(2);
  });

  it("shows an empty state when there is no session", async () => {
    list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Belum ada sesi pengukuran")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an error with a retry that loads again", async () => {
    const user = userEvent.setup();
    list.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce([session()]);
    renderPage();

    expect(await screen.findByText("Gagal memuat sesi pengukuran. Coba lagi.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await row("Uji Coba DeepSeek")).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  // Phone width: the table scrolls inside its own box, like the product list (SCRUM-204 F2).
  it("keeps the table inside a horizontal scroll box", async () => {
    list.mockResolvedValue([session()]);
    renderPage();
    await row("Uji Coba DeepSeek");

    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto", "relative");
  });
});

describe("RunsPage Arsipkan visibility (AC10, D10)", () => {
  it("offers Arsipkan to Admin on ended sessions only", async () => {
    list.mockResolvedValue([
      session({ id: "a", label: "Sesi selesai", status: "finished" }),
      session({ id: "b", label: "Sesi gagal", status: "failed" }),
      session({ id: "c", label: "Sesi berjalan", status: "running" }),
      session({ id: "d", label: "Sesi antre", status: "queued" }),
    ]);
    renderPage();
    await row("Sesi selesai");

    expect(screen.getByRole("button", { name: "Arsipkan Sesi selesai" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arsipkan Sesi gagal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arsipkan Sesi berjalan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arsipkan Sesi antre" })).not.toBeInTheDocument();
  });

  it("offers Arsipkan to Developer AI only on the sessions it started", async () => {
    signedInAs("developer_ai", "dev-1");
    list.mockResolvedValue([
      session({ id: "a", label: "Milik sendiri", created_by: "dev-1" }),
      session({ id: "b", label: "Milik Admin", created_by: "admin-1" }),
    ]);
    renderPage();
    await row("Milik sendiri");

    expect(screen.getByRole("button", { name: "Arsipkan Milik sendiri" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arsipkan Milik Admin" })).not.toBeInTheDocument();
  });

  // The page sits behind AuthGuard, but it must not crash or offer anything before /me answers.
  it("offers no Arsipkan while the signed-in user is unknown", async () => {
    useAuthMock.mockReturnValue({ status: "loading" });
    list.mockResolvedValue([session()]);
    renderPage();
    await row("Uji Coba DeepSeek");

    expect(screen.queryByRole("button", { name: /Arsipkan/ })).not.toBeInTheDocument();
  });
});

describe("RunsPage archive flow (AC10: hidden from the list, data kept)", () => {
  async function openDialog(user: ReturnType<typeof userEvent.setup>, label = "Uji Coba DeepSeek") {
    await user.click(await screen.findByRole("button", { name: `Arsipkan ${label}` }));
    return within(screen.getByRole("dialog", { name: "Arsipkan sesi?" }));
  }

  it("asks first, then removes only that row and says so", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([
      session({ id: "a", label: "Pertama" }),
      session({ id: "b", label: "Tengah" }),
      session({ id: "c", label: "Terakhir" }),
    ]);
    archive.mockResolvedValue({ ...archived, id: "b" });
    renderPage();

    const dialog = await openDialog(user, "Tengah");
    expect(dialog.getByText(/tidak dihapus/)).toBeInTheDocument();
    expect(archive).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    expect(archive).toHaveBeenCalledWith("b");
    await waitFor(() => expect(screen.queryByRole("cell", { name: "Tengah" })).not.toBeInTheDocument());
    expect(screen.getByRole("cell", { name: "Pertama" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Terakhir" })).toBeInTheDocument();
    // Same quotes as the dialog text, which sits right above it (Nizar, #67).
    expect(screen.getByText("Sesi “Tengah” diarsipkan")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state after the last session is archived", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([session()]);
    archive.mockResolvedValue(archived);
    renderPage();

    const dialog = await openDialog(user);
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    expect(await screen.findByText("Belum ada sesi pengukuran")).toBeInTheDocument();
  });

  // Negative
  it("sends nothing when the user cancels", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([session()]);
    renderPage();

    const dialog = await openDialog(user);
    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(archive).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Uji Coba DeepSeek" })).toBeInTheDocument();
  });

  it("closes on Escape without archiving", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([session()]);
    renderPage();

    await openDialog(user);
    const dialog = screen.getByRole("dialog", { name: "Arsipkan sesi?" });
    await act(async () => {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    });

    expect(archive).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Corner: a double click must not send two PATCH requests.
  it("sends one request when Arsipkan is clicked twice", async () => {
    const user = userEvent.setup();
    let finish: (value: SessionArchiveResponse) => void = () => undefined;
    list.mockResolvedValue([session()]);
    archive.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();

    const dialog = await openDialog(user);
    const confirm = dialog.getByRole("button", { name: "Arsipkan" });
    await user.click(confirm);
    await user.click(dialog.getByRole("button", { name: "Mengarsipkan…" }));

    expect(archive).toHaveBeenCalledTimes(1);
    expect(dialog.getByRole("button", { name: "Mengarsipkan…" })).toBeDisabled();
    expect(dialog.getByRole("button", { name: "Batal" })).toBeDisabled();
    await act(async () => finish(archived));
  });

  // Corner: Escape while the request runs must not drop the dialog with its pending result.
  it("keeps the dialog open on Escape while archiving", async () => {
    const user = userEvent.setup();
    let finish: (value: SessionArchiveResponse) => void = () => undefined;
    list.mockResolvedValue([session()]);
    archive.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();

    const dialog = await openDialog(user);
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));
    await act(async () => {
      screen.getByRole("dialog", { name: "Arsipkan sesi?" }).dispatchEvent(new Event("cancel", { cancelable: true }));
    });

    expect(screen.getByRole("dialog", { name: "Arsipkan sesi?" })).toBeInTheDocument();
    await act(async () => finish(archived));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  // jsdom has no showModal; a real browser opens the confirmation as a modal (focus trap, Escape).
  it("opens the confirmation with showModal when the browser has it", async () => {
    const user = userEvent.setup();
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { value: showModal, configurable: true });
    try {
      list.mockResolvedValue([session()]);
      renderPage();

      await openDialog(user);

      expect(showModal).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    }
  });

  // Developer AI on a stale list: the message stays in the dialog, no redirect (runsApi test).
  it("shows why the server refused, then reloads the list when the dialog is closed", async () => {
    const user = userEvent.setup();
    signedInAs("developer_ai", "dev-1");
    list.mockResolvedValueOnce([session()]).mockResolvedValueOnce([]);
    archive.mockRejectedValue(new ApiError(403, "NOT_YOUR_SESSION"));
    renderPage();

    const dialog = await openDialog(user);
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Developer AI hanya bisa mengarsipkan sesi yang ia buat.");
    expect(screen.getByRole("cell", { name: "Uji Coba DeepSeek" })).toBeInTheDocument();

    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Belum ada sesi pengukuran")).toBeInTheDocument();
  });

  // Someone else archived it first: nothing to retry, closing brings the list up to date.
  it("explains an already archived session and drops it from the list on close", async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce([session()]).mockResolvedValueOnce([]);
    archive.mockRejectedValue(new ApiError(409, "SESSION_ALREADY_ARCHIVED"));
    renderPage();

    const dialog = await openDialog(user);
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi ini sudah diarsipkan.");
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    expect(await screen.findByText("Belum ada sesi pengukuran")).toBeInTheDocument();
  });

  it.each([
    [new TypeError("Failed to fetch"), "Sesi gagal diarsipkan. Coba lagi."],
    [new ApiError(500, "INTERNAL_ERROR"), "Sesi gagal diarsipkan. Coba lagi."],
  ])("explains a failed archive (%s) and lets the user try again", async (error, message) => {
    const user = userEvent.setup();
    list.mockResolvedValue([session()]);
    archive.mockRejectedValueOnce(error).mockResolvedValueOnce(archived);
    renderPage();

    const dialog = await openDialog(user);
    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(message);

    await user.click(dialog.getByRole("button", { name: "Arsipkan" }));

    await waitFor(() => expect(screen.queryByRole("cell", { name: "Uji Coba DeepSeek" })).not.toBeInTheDocument());
    expect(archive).toHaveBeenCalledTimes(2);
  });
});
