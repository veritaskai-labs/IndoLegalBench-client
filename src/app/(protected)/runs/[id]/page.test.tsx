import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { getSession } from "@/lib/runs/runsApi";
import { acceptAsIs, pauseSession } from "@/lib/runs/sessionControlApi";
import type { Role } from "@/types";
import type { AttemptResult, SessionCaseResult, SessionDetail } from "@/types/measurement";
import SessionDetailPage from "./page";

// The page reads the id from the URL; useParams hands it over still encoded.
const params = vi.hoisted(() => ({ id: "s-1" }));
vi.mock("next/navigation", () => ({ useParams: () => params }));

// runsApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/runs/runsApi", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/runs/sessionControlApi", () => ({
  acceptAsIs: vi.fn(),
  clearAcceptAsIs: vi.fn(),
  pauseSession: vi.fn(),
  cancelSession: vi.fn(),
  resumeSession: vi.fn(),
}));
// The toast lives in the protected layout; SessionControls.test checks its text with the real provider.
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const useAuthMock = vi.hoisted(() => vi.fn());
// The role decides which answer placeholder Developer AI sees.
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

const get = vi.mocked(getSession);

function signedInAs(role: Role) {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { id: "u-1", name: "Uji", email: "u@veritask.test", role },
  });
}

// Placeholder text only: students do not write legal case content (L1).
function attempt(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return { repetition_no: 1, status: "succeeded", answer_text: "Jawaban mentah percobaan 1", model_version: "model-qa-1", ...overrides };
}

function devCase(overrides: Partial<SessionCaseResult> = {}): SessionCaseResult {
  return {
    snapshot_item_id: "item-1",
    case_id: "case-1",
    case_code: "QA-001",
    title: "Judul kasus sintetis",
    question: "Pertanyaan kasus sintetis",
    split_tag: "dev",
    masked: false,
    version_no: 2,
    sections: {
      "identity.title": "Judul kasus sintetis",
      "identity.question": "Pertanyaan kasus sintetis",
      category: "Kategori sintetis",
      case_code: "QA-001",
      split_tag: "dev",
      legal_refs: [{ kind: "free_text", free_text: "Rujukan sintetis 1", links: [], display_text: "Rujukan sintetis 1" }],
      answer_criteria: { must_contain: ["unsur sintetis"], must_not_contain: [], expected_conclusion: "kesimpulan sintetis" },
      traps: [{ description: "jebakan sintetis", expected_model_behavior: "menolak" }],
    },
    attempts: [attempt()],
    ...overrides,
  };
}

function session(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: "s-1",
    label: "Uji Coba Gemini",
    created_at: "2026-11-03T02:00:00Z",
    created_by: "u-1",
    created_by_name: "Uji Admin",
    product_id: "p-1",
    product_name: "Gemini",
    case_count: 1,
    repetitions: 3,
    status: "finished",
    progress: { completed: 3, total: 3 },
    purpose: "trial",
    split_filter: "both",
    snapshot_created_at: "2026-11-03T02:05:00Z",
    started_at: "2026-11-03T02:05:00Z",
    finished_at: "2026-11-03T02:30:00Z",
    archived_at: null,
    stopped_at: null,
    stop_reason: null,
    accepted_as_is_at: null,
    accepted_as_is_by: null,
    accepted_as_is_reason: null,
    report_eligible: true,
    resumed_after_long_pause: false,
    model_version_unverified: false,
    resume_error_code: null,
    cases: [devCase()],
    ...overrides,
  };
}

// The code also appears in the snapshot's "ID kasus" section, so look for it in the summary.
function caseCard(code: string) {
  return screen.getByText(code, { selector: "summary span" }).closest("details") as HTMLElement;
}

async function openCase(user: ReturnType<typeof userEvent.setup>, code = "QA-001") {
  await screen.findByRole("heading", { level: 1 });
  const card = caseCard(code);
  await user.click(within(card).getByText(code, { selector: "summary span" }));
  return within(card);
}

beforeEach(() => {
  get.mockReset();
  params.id = "s-1";
  signedInAs("admin");
});

describe("SessionDetailPage header (PBI-11 AC6, AC10)", () => {
  it("shows the session label, status and every setting of the run", async () => {
    get.mockResolvedValue(session());
    render(<SessionDetailPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Uji Coba Gemini" })).toBeInTheDocument();
    const facts = within(screen.getByRole("region", { name: "Ringkasan sesi" }));
    expect(facts.getByText("Selesai")).toBeInTheDocument();
    expect(facts.getByText("Gemini")).toBeInTheDocument();
    expect(facts.getByText("Uji Coba")).toBeInTheDocument();
    expect(facts.getByText("Semua (Dev & Test)")).toBeInTheDocument();
    expect(facts.getByText("3 dari 3")).toBeInTheDocument();
    expect(facts.getByText("03 Nov 2026, 09.00 WIB · Uji Admin")).toBeInTheDocument();
    expect(facts.getByText("03 Nov 2026, 09.30 WIB")).toBeInTheDocument();
  });

  // AC6: the snapshot carries its own time.
  it("shows when the case snapshot was made", async () => {
    get.mockResolvedValue(session());
    render(<SessionDetailPage />);

    const facts = within(await screen.findByRole("region", { name: "Ringkasan sesi" }));
    expect(facts.getByText("Snapshot kasus").nextElementSibling).toHaveTextContent("03 Nov 2026, 09.05 WIB");
  });

  it("links back to the session list", async () => {
    get.mockResolvedValue(session());
    render(<SessionDetailPage />);

    expect(await screen.findByRole("link", { name: "Eksekusi" })).toHaveAttribute("href", "/runs");
  });

  // The URL segment arrives encoded; runsApi encodes it again, so the page must decode it once.
  it("asks for the session id from the URL, decoded once", async () => {
    params.id = "a%2Fb";
    get.mockResolvedValue(session());
    render(<SessionDetailPage />);

    await screen.findByRole("heading", { level: 1 });
    expect(get).toHaveBeenCalledWith("a/b");
  });

  // PBI-12 AC9: a budget or restart stop reads Dihentikan, a user pause Dijeda.
  it.each([
    ["budget", "Dihentikan"],
    ["user", "Dijeda"],
  ] as const)("names a paused session by why it stopped (%s)", async (reason, label) => {
    get.mockResolvedValue(session({ status: "paused", stop_reason: reason, stopped_at: "2026-11-03T02:20:00Z" }));
    render(<SessionDetailPage />);

    const facts = within(await screen.findByRole("region", { name: "Ringkasan sesi" }));
    expect(facts.getByText("Status").nextElementSibling).toHaveTextContent(label);
  });

  it("says when a session has been archived", async () => {
    get.mockResolvedValue(session({ archived_at: "2026-11-03T03:00:00Z" }));
    render(<SessionDetailPage />);

    expect(await screen.findByText(/Sesi ini sudah diarsipkan/)).toBeInTheDocument();
  });

  // Edge: queued, the snapshot does not exist yet.
  it("explains a queued session without a snapshot or cases", async () => {
    get.mockResolvedValue(
      session({ status: "queued", snapshot_created_at: null, started_at: null, finished_at: null, case_count: null, progress: { completed: 0, total: 0 }, cases: [] }),
    );
    render(<SessionDetailPage />);

    const facts = within(await screen.findByRole("region", { name: "Ringkasan sesi" }));
    expect(facts.getByText("Snapshot kasus").nextElementSibling).toHaveTextContent("Dibuat saat sesi mulai");
    expect(facts.getByText("Menunggu antrean")).toBeInTheDocument();
    expect(screen.getByText("Belum ada kasus. Snapshot kasus dibuat saat sesi mulai berjalan.")).toBeInTheDocument();
  });
});

describe("SessionDetailPage snapshot detail (PBI-11 AC7)", () => {
  it("lists each case with its code, title, tag and attempt summary", async () => {
    get.mockResolvedValue(session());
    render(<SessionDetailPage />);
    await screen.findByRole("heading", { level: 1 });

    const card = within(caseCard("QA-001"));
    const summary = within(card.getByText("QA-001", { selector: "summary span" }).closest("summary") as HTMLElement);
    expect(summary.getByText("Judul kasus sintetis")).toBeInTheDocument();
    expect(summary.getByLabelText(/Tag Dev set/)).toBeInTheDocument();
    expect(summary.getByText("1 dari 1 berhasil")).toBeInTheDocument();
  });

  // AC7: every section of the snapshot table, not the live case.
  it("shows every section of the frozen case and its version", async () => {
    const user = userEvent.setup();
    get.mockResolvedValue(session());
    render(<SessionDetailPage />);

    const card = await openCase(user);
    expect(card.getByText("Snapshot versi 2")).toBeInTheDocument();
    for (const label of ["Judul", "Pertanyaan", "Kategori", "ID kasus", "Tag dev/test", "Rujukan hukum", "Kriteria jawaban", "Pengurang Poin"]) {
      expect(card.getByText(label)).toBeInTheDocument();
    }
    expect(card.getByText("Rujukan sintetis 1")).toBeInTheDocument();
    expect(card.getByText("Kesimpulan: kesimpulan sintetis")).toBeInTheDocument();
    expect(card.getByText("1. jebakan sintetis (perilaku yang diharapkan: menolak)")).toBeInTheDocument();
  });
});

describe("SessionDetailPage raw answers (PBI-11 AC8)", () => {
  it("shows every attempt in repetition order with status, model version and the raw answer", async () => {
    const user = userEvent.setup();
    get.mockResolvedValue(
      session({
        cases: [
          devCase({
            attempts: [
              attempt({ repetition_no: 3, answer_text: "Jawaban ketiga" }),
              attempt({ repetition_no: 1, answer_text: "Jawaban pertama" }),
            ],
          }),
        ],
      }),
    );
    render(<SessionDetailPage />);

    const card = await openCase(user);
    const items = card.getAllByRole("listitem", { name: /^Percobaan/ });
    // Corner: repetition 2 is missing and stays missing.
    expect(items.map((item) => item.getAttribute("aria-label"))).toEqual(["Percobaan 1", "Percobaan 3"]);
    expect(within(items[0]).getByText("Berhasil")).toBeInTheDocument();
    expect(within(items[0]).getByText("model-qa-1")).toBeInTheDocument();
    expect(within(items[0]).getByText("Jawaban pertama")).toBeInTheDocument();
  });

  // The raw answer is shown as text: a provider's markup must never become HTML.
  it("shows markup in a raw answer as plain text", async () => {
    const user = userEvent.setup();
    const payload = '<img src=x onerror="alert(1)"> **tebal**';
    get.mockResolvedValue(session({ cases: [devCase({ attempts: [attempt({ answer_text: payload })] })] }));
    const { container } = render(<SessionDetailPage />);

    const card = await openCase(user);
    expect(card.getByText(payload)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("explains an attempt without an answer instead of leaving it blank", async () => {
    const user = userEvent.setup();
    get.mockResolvedValue(
      session({
        cases: [
          devCase({
            attempts: [
              attempt({ repetition_no: 1, status: "technical_failure", answer_text: null, model_version: null }),
              attempt({ repetition_no: 2, status: "pending", answer_text: null, model_version: null }),
            ],
          }),
        ],
      }),
    );
    render(<SessionDetailPage />);

    const card = await openCase(user);
    expect(card.getByText("Gagal teknis, tidak ada jawaban.")).toBeInTheDocument();
    expect(card.getByText("Belum ada jawaban.")).toBeInTheDocument();
  });

  // server#91: Developer AI sees progress but no answer until the session ends.
  it("tells Developer AI that answers appear once a running session ends", async () => {
    const user = userEvent.setup();
    signedInAs("developer_ai");
    get.mockResolvedValue(session({ status: "running", finished_at: null, cases: [devCase({ attempts: [attempt({ answer_text: null })] })] }));
    render(<SessionDetailPage />);

    const card = await openCase(user);
    expect(card.getByText("Jawaban tampil setelah sesi selesai.")).toBeInTheDocument();
    expect(card.getByText("Berhasil")).toBeInTheDocument();
  });

  // AC9 / D10 section C: a test case opened by Developer AI is masked by the server.
  it("shows a masked test case with its attempt statuses but no content", async () => {
    const user = userEvent.setup();
    signedInAs("developer_ai");
    get.mockResolvedValue(
      session({
        cases: [
          devCase({
            case_code: "KASUS-TEST",
            title: "Kasus test",
            question: null,
            split_tag: "test",
            masked: true,
            version_no: null,
            sections: null,
            attempts: [attempt({ answer_text: null }), attempt({ repetition_no: 2, status: "technical_failure", answer_text: null })],
          }),
        ],
      }),
    );
    render(<SessionDetailPage />);

    const card = await openCase(user, "KASUS-TEST");
    expect(card.getByText("Isi kasus test disembunyikan untuk Developer AI. Hanya status percobaan yang ditampilkan.")).toBeInTheDocument();
    expect(card.queryByText("Rujukan hukum")).not.toBeInTheDocument();
    expect(card.getAllByText("Isi kasus test disembunyikan untuk Developer AI.")).toHaveLength(2);
    expect(card.getByText("Gagal teknis")).toBeInTheDocument();
  });
});

describe("SessionDetailPage load states", () => {
  // The page sits behind AuthGuard, but it must not crash or pick a role before /me answers.
  it("shows the session while the signed-in user is still unknown, without a role-specific answer message", async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({ status: "loading" });
    get.mockResolvedValue(session({ status: "running", finished_at: null, cases: [devCase({ attempts: [attempt({ answer_text: null })] })] }));
    render(<SessionDetailPage />);

    const card = await openCase(user);
    expect(card.getByText("Tidak ada jawaban tersimpan.")).toBeInTheDocument();
    expect(card.queryByText("Jawaban tampil setelah sesi selesai.")).not.toBeInTheDocument();
  });

  it("shows a loading state while the session loads", () => {
    get.mockReturnValue(new Promise(() => undefined));
    render(<SessionDetailPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // Negative: an unknown id, or a session id that was mistyped.
  it("says the session was not found and offers the way back", async () => {
    get.mockRejectedValue(new ApiError(404, "MEASUREMENT_NOT_FOUND"));
    render(<SessionDetailPage />);

    expect(await screen.findByText("Sesi tidak ditemukan.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke Eksekusi" })).toHaveAttribute("href", "/runs");
  });

  it("shows an error with a retry that loads again", async () => {
    const user = userEvent.setup();
    get.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(session());
    render(<SessionDetailPage />);

    expect(await screen.findByText("Gagal memuat sesi pengukuran. Coba lagi.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Uji Coba Gemini" })).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
});

// PBI-12 AC9: the controls sit on the detail page and the page reloads after a change.
describe("SessionDetailPage controls (PBI-12 AC9)", () => {
  it("lets Admin accept a session with failures and loads it again", async () => {
    const user = userEvent.setup();
    get.mockResolvedValue(session({ status: "finished_with_failures" }));
    vi.mocked(acceptAsIs).mockResolvedValue({
      id: "s-1",
      accepted_as_is_at: "2026-11-05T03:00:00Z",
      accepted_as_is_by: "u-1",
      accepted_as_is_reason: "Alasan sintetis",
    });
    render(<SessionDetailPage />);

    await user.click(await screen.findByRole("button", { name: "Terima apa adanya" }));
    const dialog = within(screen.getByRole("dialog", { name: "Terima sesi apa adanya?" }));
    await user.type(dialog.getByRole("textbox", { name: "Alasan" }), "Alasan sintetis");
    await user.click(dialog.getByRole("button", { name: "Terima apa adanya" }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it("shows the accepted mark on the page", async () => {
    get.mockResolvedValue(
      session({
        status: "finished_with_failures",
        accepted_as_is_at: "2026-11-05T03:00:00Z",
        accepted_as_is_by: "u-1",
        accepted_as_is_reason: "Alasan sintetis",
      }),
    );
    render(<SessionDetailPage />);

    expect(await screen.findByRole("region", { name: "Diterima apa adanya" })).toBeInTheDocument();
  });

  // PBI-12 AC7: Jeda sits on the detail page too, and the page loads the session again after it.
  it("lets Admin pause a running session and loads it again", async () => {
    const user = userEvent.setup();
    get.mockResolvedValue(session({ status: "running", finished_at: null }));
    vi.mocked(pauseSession).mockResolvedValue({
      id: "s-1",
      status: "paused",
      stopped_at: "2026-11-05T03:00:00Z",
      stop_reason: "user",
    });
    render(<SessionDetailPage />);

    await user.click(await screen.findByRole("button", { name: "Jeda" }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
