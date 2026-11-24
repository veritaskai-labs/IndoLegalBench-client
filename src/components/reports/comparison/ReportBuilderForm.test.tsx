import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { SCOPE_UNAVAILABLE } from "@/lib/reports/builder/validationView";
import { eligibleSession, reportValidation } from "@/test/reportFixtures";
import type { Role } from "@/types";
import type {
  EligibleSession,
  ReportCreateResponse,
  ReportValidateRequest,
  ReportValidation,
} from "@/types/reports";

import { ReportBuilderForm } from "./ReportBuilderForm";

const { push, useAuthMock } = vi.hoisted(() => ({ push: vi.fn(), useAuthMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

// SCRUM-321 (PBI-15): the page wires useReportBuilder (tested on its own) to the screen. These tests check what
// the user sees and clicks: every session with its kind and reasons, the role-dependent options, and every
// answer of POST /reports shown in plain words next to the thing it is about.

const a1 = eligibleSession({ session_id: "a-1", label: "Sesi A1", product_id: "p-a", product_name: "Produk A" });
const a2 = eligibleSession({ session_id: "a-2", label: "Sesi A2", product_id: "p-a", product_name: "Produk A" });
const b1 = eligibleSession({
  session_id: "b-1",
  label: "Sesi B1",
  product_id: "p-b",
  product_name: "Produk B",
  session_type: "manual",
  purpose: "trial",
});
const c1 = eligibleSession({
  session_id: "c-1",
  label: "Sesi C1",
  product_id: "p-c",
  product_name: "Produk C",
  judge_model_version: "judge-2",
});
const x1 = eligibleSession({
  session_id: "x-1",
  label: "Sesi X1",
  product_id: "p-x",
  product_name: "Produk X",
  eligible: false,
  reasons: [{ code: "SESSION_CANCELLED", message: "Sesi ini dibatalkan dari server." }],
});
const rows = [a1, a2, b1, c1, x1];

// A small stand-in for the server's check: fewer than two products is a violation (POST /reports/validate).
function answerLikeServer(request: ReportValidateRequest) {
  const products = new Set(request.session_ids.map((id) => rows.find((r) => r.session_id === id)?.product_id));
  return Promise.resolve(
    products.size < 2
      ? reportValidation({
          valid: false,
          violations: [
            {
              kind: "selection",
              code: "NEED_AT_LEAST_TWO_PRODUCTS",
              message: "Pilih sesi dari minimal dua produk untuk dibandingkan.",
            },
          ],
          available_scopes: [],
        })
      : reportValidation(),
  );
}

function gatewayWith(overrides: Partial<ReportsGateway> = {}): ReportsGateway {
  return {
    list: vi.fn(),
    detail: vi.fn(),
    pdf: vi.fn(),
    eligibleSessions: vi.fn().mockResolvedValue(rows),
    create: vi.fn().mockResolvedValue({ report: { id: "r-1" }, warning: null }),
    validate: vi.fn(answerLikeServer),
    ...overrides,
  } as ReportsGateway;
}

function signInAs(role: Role) {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { id: "u-1", name: "Penguji", email: "uji@veritask.test", role },
  });
}

async function renderReady(gateway = gatewayWith()) {
  const user = userEvent.setup();
  render(<ReportBuilderForm gateway={gateway} />);
  await screen.findByRole("checkbox", { name: /Sesi A1/ });
  return { user, gateway };
}

/** ApiError as apiFetch builds it for report errors (details = the flat server body, cycle 10). */
function reportError(status: number, code: string, details: Record<string, unknown>) {
  return new ApiError(status, code, "Pesan server.", null, [], null, details);
}

const box = (label: RegExp) => screen.getByRole("checkbox", { name: label });
const createButton = () => screen.getByRole("button", { name: "Buat laporan" });
/** Create stays off until the server has answered the latest selection. */
const createReady = () => waitFor(() => expect(createButton()).toBeEnabled());

/** The row of the "Sesi terpilih" list that holds this session (reasons from the server appear there). */
function pickedRow(label: string) {
  const list = screen.getByRole("list", { name: "Sesi terpilih" });
  const item = within(list)
    .getAllByRole("listitem")
    .find((li) => li.textContent?.includes(label));
  if (!item) throw new Error(`${label} is not in Sesi terpilih`);
  return item;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Judul laporan"), "  Perbandingan November  ");
  await user.click(box(/Sesi A1/));
  await user.click(box(/Sesi B1/));
  await createReady();
}

beforeEach(() => {
  push.mockReset();
  signInAs("admin");
});

describe("ReportBuilderForm: page frame and list states", () => {
  it("sits under Laporan perbandingan with its own heading", async () => {
    await renderReady();
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Laporan perbandingan" })).toHaveAttribute(
      "href",
      "/reports/comparisons",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Buat laporan perbandingan" })).toBeInTheDocument();
  });

  // Positive (loading): nothing to pick yet, and no half-built form.
  it("shows a loading state while the sessions load", () => {
    render(<ReportBuilderForm gateway={gatewayWith({ eligibleSessions: vi.fn(() => new Promise<EligibleSession[]>(() => {})) })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat daftar sesi");
    expect(screen.queryByRole("button", { name: "Buat laporan" })).not.toBeInTheDocument();
  });

  // Negative: the list call fails; the user can try again without reloading the whole page.
  it("shows an error with a retry that asks the server again", async () => {
    const eligibleSessions = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(rows);
    const user = userEvent.setup();
    render(<ReportBuilderForm gateway={gatewayWith({ eligibleSessions })} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat daftar sesi. Coba lagi.");
    await user.click(screen.getByRole("button", { name: /Coba lagi/ }));

    expect(await screen.findByRole("checkbox", { name: /Sesi A1/ })).toBeInTheDocument();
    expect(eligibleSessions).toHaveBeenCalledTimes(2);
  });

  // Edge: a fresh environment (or a Viewer with nothing visible) has no session at all. Say why, not a blank list.
  it("explains an empty list instead of showing an empty form", async () => {
    render(<ReportBuilderForm gateway={gatewayWith({ eligibleSessions: vi.fn().mockResolvedValue([]) })} />);
    expect(await screen.findByText("Belum ada sesi yang bisa dipilih")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buat laporan" })).not.toBeInTheDocument();
  });
});

describe("ReportBuilderForm: the session picker (AC1, AC4, AC5)", () => {
  // Positive (AC1): every session is listed, no cap; each says its product, label and kind.
  it("lists every session with product, label and kind", async () => {
    await renderReady();
    for (const name of [/Produk A · Sesi A1/, /Produk A · Sesi A2/, /Produk B · Sesi B1/, /Produk C · Sesi C1/]) {
      expect(box(name)).toBeEnabled();
    }
    expect(within(box(/Sesi A1/).closest("li") as HTMLElement).getByText("Otomatis")).toBeInTheDocument();
    expect(within(box(/Sesi B1/).closest("li") as HTMLElement).getByText("Manual")).toBeInTheDocument();
  });

  // Positive (AC4): a trial session may be picked but is clearly marked.
  it("marks a trial session as Uji Coba", async () => {
    await renderReady();
    const row = box(/Sesi B1/).closest("li");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Uji Coba")).toBeInTheDocument();
  });

  // Negative (AC4): an ineligible session can't be picked, and the server's reason sits next to it. SCRUM-365
  // moved it to the "Tidak valid" tab, where it stays visible instead of being hidden.
  it("disables an ineligible session and shows the server's reason next to it", async () => {
    const { user } = await renderReady();
    expect(screen.queryByRole("checkbox", { name: /Sesi X1/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Tidak valid (1)" }));
    expect(box(/Sesi X1/)).toBeDisabled();
    const row = box(/Sesi X1/).closest("li") as HTMLElement;
    expect(within(row).getByText("Sesi ini dibatalkan dari server.")).toBeInTheDocument();
  });

  // Edge (AC1): two sessions of one product. Picking the second replaces the first, so DUPLICATE_PRODUCT never
  // reaches the server.
  it("keeps one session per product", async () => {
    const { user } = await renderReady();
    await user.click(box(/Sesi A1/));
    await user.click(box(/Sesi A2/));
    expect(box(/Sesi A1/)).not.toBeChecked();
    expect(box(/Sesi A2/)).toBeChecked();
  });

  // Positive (AC5): the filter shows one kind of session.
  it("shows only manual sessions when the filter is Manual", async () => {
    const { user } = await renderReady();
    await user.click(screen.getByRole("radio", { name: "Manual" }));
    expect(screen.getByRole("checkbox", { name: /Sesi B1/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Sesi A1/ })).not.toBeInTheDocument();
  });

  // Edge (AC5): the server drops sessions outside the filter without a word. The page names them instead.
  it("names picked sessions the filter leaves out", async () => {
    const { user } = await renderReady();
    await user.click(box(/Sesi A1/));
    await user.click(box(/Sesi B1/));
    await user.click(screen.getByRole("radio", { name: "Manual" }));
    expect(screen.getByText(/tidak ikut karena filter/)).toHaveTextContent("Produk A · Sesi A1");
  });

  // Edge: a picked session can always be removed from the "Sesi terpilih" list, even when the filter hides it
  // or a reload no longer lists it (404 missing). Otherwise the user is stuck with a session they can't see.
  it("lets the user remove a picked session from the picked list", async () => {
    const { user } = await renderReady();
    await user.click(box(/Sesi A1/));
    await user.click(within(pickedRow("Produk A · Sesi A1")).getByRole("button", { name: /Lepas/ }));
    expect(box(/Sesi A1/)).not.toBeChecked();
    expect(screen.queryByRole("list", { name: "Sesi terpilih" })).not.toBeInTheDocument();
  });

  // Edge: the filter hides a picked session from the picker, so the picked list is the only place to let it go.
  it("lets the user remove a session the filter hides", async () => {
    const { user } = await renderReady();
    await user.click(box(/Sesi A1/));
    await user.click(box(/Sesi B1/));
    await user.click(screen.getByRole("radio", { name: "Manual" }));
    await user.click(within(pickedRow("Produk A · Sesi A1")).getByRole("button", { name: /Lepas/ }));
    expect(screen.queryByText(/tidak ikut karena filter/)).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Sesi terpilih" })).getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("ReportBuilderForm: options per role (AC9, AC14)", () => {
  it.each<[Role, string[]]>([
    ["admin", ["Test", "Dev", "Dev + Test"]],
    ["developer_ai", ["Test", "Dev", "Dev + Test"]],
    ["viewer", ["Test"]],
    ["contributor", ["Test"]],
  ])("%s sees score types %j", async (role, scopes) => {
    signInAs(role);
    await renderReady();
    const group = screen.getByRole("group", { name: "Jenis nilai" });
    expect(within(group).getAllByRole("radio")).toHaveLength(scopes.length);
    for (const scope of scopes) expect(within(group).getByRole("radio", { name: scope })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Test" })).toBeChecked();
  });

  // Positive (AC9): only Admin chooses the product label; real names are the default.
  it("lets Admin choose the product label, real name first", async () => {
    await renderReady();
    const group = screen.getByRole("group", { name: "Label produk" });
    expect(within(group).getByRole("radio", { name: "Nama asli" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Kode (anonim)" })).not.toBeChecked();
  });

  // Positive (SCRUM-367): each label option explains what happens in the report, read out with the radio.
  it("explains what each label option does in the report", async () => {
    await renderReady();
    const group = screen.getByRole("group", { name: "Label produk" });
    expect(within(group).getByRole("radio", { name: "Nama asli" })).toHaveAccessibleDescription(
      /sesuai penulisan aslinya/,
    );
    expect(within(group).getByRole("radio", { name: "Kode (anonim)" })).toHaveAccessibleDescription(
      /Product A.*hanya Admin/,
    );
  });

  // Positive (SCRUM-367): the preview follows the picked sessions and the chosen label.
  it("previews the label of each picked product and follows the choice", async () => {
    const { user } = await renderReady();
    expect(screen.getByText("Pilih sesi untuk melihat pratinjau label.")).toBeInTheDocument();

    await user.click(box(/Sesi B1/));
    await user.click(box(/Sesi A1/));
    const preview = () => within(screen.getByRole("list", { name: "Pratinjau label produk" }));
    expect(preview().getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Produk B → Produk B",
      "Produk A → Produk A",
    ]);

    await user.click(screen.getByRole("radio", { name: "Kode (anonim)" }));
    expect(preview().getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Produk B → Product A",
      "Produk A → Product B",
    ]);
  });

  // Negative: the label choice is Admin only, so the preview is not offered to other roles either.
  it.each<Role>(["developer_ai", "viewer", "contributor"])("hides the label preview from %s", async (role) => {
    signInAs(role);
    const { user } = await renderReady();
    await user.click(box(/Sesi A1/));
    expect(screen.queryByRole("list", { name: "Pratinjau label produk" })).not.toBeInTheDocument();
  });

  // Edge: before /me answers the role is unknown, so the role rules offer no score type at all. Showing the form
  // then would mean an empty "Jenis nilai" group next to a Create that still sends Test. Wait for the role instead.
  it("waits for the role before showing the form", async () => {
    useAuthMock.mockReturnValue({ status: "loading" });
    render(<ReportBuilderForm gateway={gatewayWith()} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Memuat akun Anda"));
    expect(screen.queryByRole("group", { name: "Jenis nilai" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buat laporan" })).not.toBeInTheDocument();
  });

  it.each<Role>(["developer_ai", "viewer", "contributor"])("hides the label choice from %s", async (role) => {
    signInAs(role);
    await renderReady();
    expect(screen.queryByRole("group", { name: "Label produk" })).not.toBeInTheDocument();
  });
});

describe("ReportBuilderForm: title and Create", () => {
  // Negative: Create stays off until there is a title and two products (the 422 and
  // NEED_AT_LEAST_TWO_PRODUCTS are avoided, not shown after the fact).
  it("keeps Create off until a title and two products are picked", async () => {
    const { user } = await renderReady();
    expect(createButton()).toBeDisabled();
    await user.type(screen.getByLabelText("Judul laporan"), "Laporan");
    await user.click(box(/Sesi A1/));
    expect(createButton()).toBeDisabled();
    expect(await screen.findByText("Pilih sesi dari minimal dua produk untuk dibandingkan.")).toBeInTheDocument();
    await user.click(box(/Sesi B1/));
    await createReady();
  });

  // Edge: a title of spaces passes `length` but the server rejects it. Told after the user leaves the field,
  // not on an untouched form.
  it("asks for a title once the field was left blank", async () => {
    const { user } = await renderReady();
    expect(screen.queryByText("Isi judul laporan.")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Judul laporan"), "   ");
    await user.tab();
    expect(screen.getByText("Isi judul laporan.")).toBeInTheDocument();
  });

  // Edge: 201 characters is one over the server limit.
  it("says when the title is too long", async () => {
    const { user } = await renderReady();
    const input = screen.getByLabelText("Judul laporan");
    await user.click(input);
    await user.paste("a".repeat(201));
    expect(screen.getByText("Judul paling panjang 200 karakter.")).toBeInTheDocument();
  });

  // Positive (AC1): one POST with exactly what the form shows, then the saved report opens.
  it("sends the form once and opens the saved report", async () => {
    const { user, gateway } = await renderReady();
    await fillValidForm(user);
    await user.click(screen.getByRole("radio", { name: "Dev + Test" }));
    await user.click(screen.getByRole("radio", { name: "Kode (anonim)" }));
    await createReady(); // a new score type is checked again before Create
    await user.click(createButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/reports/comparisons/r-1"));
    // Screen readers hear the save before the next page loads (a status region, not an alert).
    expect(screen.getByRole("status")).toHaveTextContent("Laporan tersimpan. Membuka laporan…");
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(gateway.create).toHaveBeenCalledWith({
      title: "Perbandingan November",
      session_ids: ["a-1", "b-1"],
      score_scope: "dev_test",
      measurement_filter: "all",
      product_label_mode: "code",
      language: "en",
    });
  });

  // Edge: a native form submit would reload the page and lose every pick.
  it("keeps the browser from reloading the page on submit", async () => {
    const { user } = await renderReady();
    await fillValidForm(user);
    const form = createButton().closest("form") as HTMLFormElement;
    expect(fireEvent.submit(form)).toBe(false);
  });

  // Edge: each click is a new report on the server (no idempotency key), so Create is off while sending.
  it("turns Create off while the report is being made", async () => {
    const create = vi.fn(() => new Promise<ReportCreateResponse>(() => {}));
    const { user } = await renderReady(gatewayWith({ create }));
    await fillValidForm(user);
    await user.click(createButton());

    const sending = screen.getByRole("button", { name: "Membuat laporan…" });
    expect(sending).toBeDisabled();
    await user.click(sending);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("ReportBuilderForm: answers of POST /reports", () => {
  async function submitWith(create: ReportsGateway["create"]) {
    const { user } = await renderReady(gatewayWith({ create }));
    await fillValidForm(user);
    await user.click(createButton());
    return user;
  }

  // Edge: 200 with report null. A success status without a report must not open /comparisons/undefined.
  it("explains NO_SHARED_CASES, keeps the form and opens nothing", async () => {
    await submitWith(vi.fn().mockResolvedValue({ report: null, warning: "NO_SHARED_CASES" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("tidak punya kasus uji yang sama");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Judul laporan")).toHaveValue("  Perbandingan November  ");
  });

  // Negative (AC4, AC13): every reason at once, each next to what it is about; comparison rules in the
  // server's own words (SUITE_VERSION is already generalized by the server for roles that may not see codes).
  it("shows every reason of a 409 at once, session reasons next to their session", async () => {
    const error = reportError(409, "REPORT_NOT_COMPARABLE", {
      selection_errors: ["NEED_AT_LEAST_TWO_PRODUCTS"],
      ineligible: { "b-1": ["SESSION_NOT_GRADED"] },
      rejections: [
        { requirement: "RUBRIC_VERSION", message: "Versi rubrik berbeda." },
        { requirement: "SUITE_VERSION", message: "Kumpulan kasus uji berbeda." },
      ],
    });
    await submitWith(vi.fn().mockRejectedValue(error));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Pilih sesi dari minimal dua produk untuk dibandingkan.");
    expect(alert).toHaveTextContent("Versi rubrik berbeda.");
    expect(alert).toHaveTextContent("Kumpulan kasus uji berbeda.");
    expect(alert).toHaveTextContent("Alasannya ada di daftar Sesi terpilih.");
    expect(within(pickedRow("Produk B · Sesi B1")).getByText(/belum dinilai/)).toBeInTheDocument();
    expect(within(pickedRow("Produk A · Sesi A1")).queryByText(/belum dinilai/)).not.toBeInTheDocument();
  });

  // Edge: a 409 with only comparison rules. Pointing to session reasons that are not there sends the user looking.
  it("does not point to session reasons when the 409 has none", async () => {
    const error = reportError(409, "REPORT_NOT_COMPARABLE", {
      selection_errors: [],
      ineligible: {},
      rejections: [{ requirement: "JUDGE_MODEL", message: "LLM judge berbeda." }],
    });
    await submitWith(vi.fn().mockRejectedValue(error));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("LLM judge berbeda.");
    expect(alert).not.toHaveTextContent("Sesi terpilih");
  });

  // Negative: a session was deleted or archived after the list loaded. Mark exactly that one and offer a reload.
  it("marks sessions that are gone (404) and offers to reload the list", async () => {
    const error = reportError(404, "REPORT_SESSION_NOT_FOUND", { missing: ["a-1"] });
    const eligibleSessions = vi.fn().mockResolvedValue(rows);
    const { user } = await renderReady(
      gatewayWith({ eligibleSessions, create: vi.fn().mockRejectedValue(error) }),
    );
    await fillValidForm(user);
    await user.click(createButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("sudah tidak tersedia");
    expect(within(pickedRow("Produk A · Sesi A1")).getByText("Sesi ini sudah tidak tersedia.")).toBeInTheDocument();
    expect(within(pickedRow("Produk B · Sesi B1")).queryByText("Sesi ini sudah tidak tersedia.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Muat ulang daftar" }));
    await waitFor(() => expect(eligibleSessions).toHaveBeenCalledTimes(2));
  });

  // Negative (AC9, AC14, A01): the UI hides forbidden options, but the server is the guard. A forced 403 still
  // reads as a plain message.
  it.each([
    ["REPORT_SCOPE_FORBIDDEN", "jenis nilai ini"],
    ["REPORT_LABEL_MODE_FORBIDDEN", "kode produk"],
  ])("explains a forced 403 %s", async (code, text) => {
    await submitWith(vi.fn().mockRejectedValue(reportError(403, code, {})));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
  });

  // Negative: anything else gets a line the user can act on, never an empty box.
  it("shows a general failure when the server breaks", async () => {
    await submitWith(vi.fn().mockRejectedValue(new Error("network")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Laporan gagal dibuat. Coba lagi.");
  });

  // Negative: the server's own sentence is more precise than a general line, so it wins when there is one.
  it.each([
    [500, "INTERNAL", "Server sedang sibuk, coba beberapa menit lagi.", "Server sedang sibuk, coba beberapa menit lagi."],
    [422, "VALIDATION_ERROR", "Judul tidak boleh kosong.", "Judul tidak boleh kosong."],
    [422, "VALIDATION_ERROR", null, "Isian belum lengkap. Periksa judul dan sesi yang dipilih."],
  ])("shows %i %s with the server message %j", async (status, code, serverMessage, text) => {
    await submitWith(vi.fn().mockRejectedValue(new ApiError(status, code, serverMessage)));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
  });

  // Edge: the answer belongs to the picks that were sent. Changing the picks clears it.
  it("clears the old answer when the picks change", async () => {
    const user = await submitWith(vi.fn().mockRejectedValue(new Error("network")));
    await screen.findByRole("alert");
    await user.click(box(/Sesi C1/));
    expect(screen.queryByText("Laporan gagal dibuat. Coba lagi.")).not.toBeInTheDocument();
  });
});

// SCRUM-366: the page shows the server's check while the sessions are picked, not after Create. The rules are the
// server's (tested there); these tests check that every answer shows next to the thing it is about.
describe("ReportBuilderForm: live validation (SCRUM-366)", () => {
  const rubric = { kind: "requirement", code: "RUBRIC_VERSION", message: "Versi rubrik sesi terpilih berbeda." } as const;
  const slice = { kind: "case_slice", code: "NO_SHARED_CASES", message: "Sesi terpilih tidak punya kasus yang sama." } as const;
  const cancelled = { kind: "session", code: "SESSION_CANCELLED", message: "Sesi ini dibatalkan.", session_id: "b-1" } as const;

  const answering = (verdict: ReportValidation) => gatewayWith({ validate: vi.fn().mockResolvedValue(verdict) });

  async function pickTwo(user: ReturnType<typeof userEvent.setup>) {
    await user.click(box(/Sesi A1/));
    await user.click(box(/Sesi B1/));
  }

  // AC1 AC13: all problems at once, before anyone clicks Create.
  it("shows every violation as soon as the sessions are picked and keeps Create off", async () => {
    const { user } = await renderReady(answering(reportValidation({ valid: false, violations: [rubric, slice] })));

    await pickTwo(user);

    expect(await screen.findByText(rubric.message)).toBeInTheDocument();
    expect(screen.getByText(slice.message)).toBeInTheDocument();
    expect(createButton()).toBeDisabled();
  });

  // AC4: a session that cannot be used is explained on its own row.
  it("shows a session violation on that session's row", async () => {
    const { user } = await renderReady(answering(reportValidation({ valid: false, violations: [cancelled] })));

    await pickTwo(user);

    const row = pickedRow("Produk B · Sesi B1");
    expect(await within(row).findByText(cancelled.message)).toBeInTheDocument();
    expect(within(pickedRow("Produk A · Sesi A1")).queryByText(cancelled.message)).not.toBeInTheDocument();
  });

  // AC5: warnings inform, they do not stop Create.
  it("shows a warning without turning Create off", async () => {
    const warning = { code: "REPETITIONS_DIFFER", message: "Jumlah percobaan sesi berbeda." };
    const { user } = await renderReady(answering(reportValidation({ warnings: [warning] })));

    await fillValidForm(user);

    expect(await screen.findByText(warning.message)).toBeInTheDocument();
    expect(createButton()).toBeEnabled();
  });

  // AC14: a score type the picked cases cannot give is off, with the reason beside it.
  it("disables a score type the server does not offer and gives the reason", async () => {
    const { user } = await renderReady(answering(reportValidation({ available_scopes: ["test"] })));

    await pickTwo(user);

    await waitFor(() => expect(screen.getByRole("radio", { name: "Dev" })).toBeDisabled());
    expect(screen.getByRole("radio", { name: "Dev" })).toHaveAccessibleDescription(SCOPE_UNAVAILABLE.dev);
    expect(screen.getByRole("radio", { name: "Test" })).toBeEnabled();
  });

  // AC14: the picked cases are dev only, so the active Test choice moves to Dev by itself.
  it("moves the active score type to one that is available", async () => {
    const { user } = await renderReady(answering(reportValidation({ available_scopes: ["dev"] })));

    await pickTwo(user);

    await waitFor(() => expect(screen.getByRole("radio", { name: "Dev" })).toBeChecked());
    expect(screen.getByRole("radio", { name: "Test" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Test" })).toBeDisabled();
  });

  // Edge: Create must not look ready while the latest selection is still being checked.
  it("says it is checking and keeps Create off until the answer arrives", async () => {
    const waiting = gatewayWith({ validate: vi.fn(() => new Promise<ReportValidation>(() => {})) });
    const { user } = await renderReady(waiting);
    await user.type(screen.getByLabelText("Judul laporan"), "Laporan");

    await pickTwo(user);

    expect(await screen.findByText("Memeriksa pilihan…")).toBeInTheDocument();
    expect(createButton()).toBeDisabled();
  });

  // Accessibility: a screen reader should hear the result of a check, not "Memeriksa pilihan" after every click.
  it("does not announce the checking note", async () => {
    const waiting = gatewayWith({ validate: vi.fn(() => new Promise<ReportValidation>(() => {})) });
    const { user } = await renderReady(waiting);

    await user.click(box(/Sesi A1/));

    expect((await screen.findByText("Memeriksa pilihan…")).closest("[aria-live]")).toBeNull();
  });

  it("announces the result of a check", async () => {
    const { user } = await renderReady(answering(reportValidation({ valid: false, violations: [rubric] })));

    await user.click(box(/Sesi A1/));

    const violation = await screen.findByText(rubric.message);
    expect(violation.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });

  // Negative: the check itself fails. The user can retry, and Create stays on because the server checks again.
  it("shows a failed check with a retry and keeps Create on", async () => {
    const validateSelection = vi.fn<ReportsGateway["validate"]>()
      .mockRejectedValueOnce(new ApiError(500, "X"))
      .mockResolvedValue(reportValidation());
    const validate = vi.fn<ReportsGateway["validate"]>((request) =>
      request.session_ids.length === 2 ? validateSelection(request) : answerLikeServer(request),
    );
    const { user } = await renderReady(gatewayWith({ validate }));
    // The initial check may finish before either session is picked.
    await waitFor(() => expect(validate).toHaveBeenCalledWith(expect.objectContaining({ session_ids: [] })));
    await fillValidForm(user);

    expect(await screen.findByText(/Pemeriksaan pilihan gagal/)).toBeInTheDocument();
    expect(createButton()).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Periksa lagi" }));

    await waitFor(() => expect(validateSelection).toHaveBeenCalledTimes(2));
    expect(validateSelection.mock.calls[1][0]).toEqual(validateSelection.mock.calls[0][0]);
    await waitFor(() => expect(screen.queryByText(/Pemeriksaan pilihan gagal/)).not.toBeInTheDocument());
  });

  // The old local message about judges is gone: the same fact now comes from the server as a violation.
  it("does not warn about judges by itself", async () => {
    const { user } = await renderReady();
    await user.type(screen.getByLabelText("Judul laporan"), "Laporan");

    await user.click(box(/Sesi A1/));
    await user.click(box(/Sesi C1/));

    await createReady();
    expect(screen.queryByText(/LLM judge yang berbeda/)).not.toBeInTheDocument();
  });
});

// SCRUM-365 (PBI-15 AC1, AC4, AC5): the session field gets a search bar, "Valid" / "Tidak valid" tabs and a
// product filter that takes more than one product. The rules are tested in sessionSearch.test.ts and the state
// in useReportBuilder.test.tsx; these tests check what the user sees and that picks survive every switch.
describe("ReportBuilderForm: search, tabs and product filter (SCRUM-365)", () => {
  const searchBar = () => screen.getByRole("searchbox", { name: "Cari sesi" });
  const productBox = (name: string) =>
    within(screen.getByRole("group", { name: "Filter produk" })).getByRole("checkbox", { name });

  it("Positif: opens on the Valid tab, with a count on each tab", async () => {
    await renderReady();

    const tabs = screen.getByRole("tablist", { name: "Kelayakan sesi" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Valid (4)", "Tidak valid (1)"]);
    expect(screen.getByRole("tab", { name: "Valid (4)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Valid (4)");
  });

  it("Positif: the search bar finds sessions by product name and session name", async () => {
    const { user } = await renderReady();

    await user.type(searchBar(), "produk b");
    const shown = within(screen.getByRole("tabpanel")).getAllByRole("checkbox");
    expect(shown.map((session) => session.closest("label")?.textContent)).toEqual(["Produk B · Sesi B1"]);

    await user.clear(searchBar());
    await user.type(searchBar(), "SESI A2");
    expect(box(/Sesi A2/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Sesi A1/ })).not.toBeInTheDocument();
  });

  it("Positif: the product dropdown takes more than one product and says how many are chosen", async () => {
    const { user } = await renderReady();
    expect(screen.getByText("Produk: semua")).toBeInTheDocument();

    await user.click(productBox("Produk A"));
    await user.click(productBox("Produk C"));

    expect(screen.getByText("Produk: 2 dipilih")).toBeInTheDocument();
    expect(box(/Sesi A1/)).toBeInTheDocument();
    expect(box(/Sesi C1/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Sesi B1/ })).not.toBeInTheDocument();
  });

  // SCRUM-368 (UAT feedback Sprint 4): the product filter must look like a filter. It gets a filter icon, sits to
  // the left of the search bar, opens its panel to the right, and shows when products are chosen. What it does
  // stays the same (the SCRUM-365 tests around this block are unchanged).
  describe("the product filter button (SCRUM-368)", () => {
    /** The <summary> that opens the product panel; its own text is the button label. */
    const filterButton = (label = "Produk: semua") => {
      const button = screen.getByText(label);
      expect(button.tagName).toBe("SUMMARY");
      return button;
    };
    const panel = () => screen.getByRole("group", { name: "Filter produk" });

    it("Positif: comes before the search bar", async () => {
      await renderReady();

      const order = filterButton().compareDocumentPosition(searchBar());
      expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    // Tab from the measurement radios until one of the two toolbar controls has focus: it must be the filter.
    // (Not Shift+Tab from the search: jsdom keeps the checkboxes of a closed <details> focusable, browsers do not.)
    it("Positif: is reached with Tab before the search bar", async () => {
      const { user } = await renderReady();
      const toolbar = [filterButton(), searchBar()];

      screen.getByRole("radio", { name: "Semua" }).focus();
      for (let i = 0; i < 5 && !toolbar.includes(document.activeElement as HTMLElement); i += 1) await user.tab();

      expect(filterButton()).toHaveFocus();
    });

    // The icon is drawn in the page (no icon library) and is decoration only: a screen reader reads the label.
    it("Positif: starts with a filter icon that screen readers skip", async () => {
      await renderReady();

      const button = filterButton();
      const icons = button.querySelectorAll("svg");
      // firstChild, not firstElementChild: the icon must come before the label text node.
      expect(button.firstChild?.nodeName.toLowerCase()).toBe("svg");
      expect(icons.length).toBeGreaterThan(0);
      for (const icon of icons) {
        expect(icon).toHaveAttribute("aria-hidden", "true");
        expect(icon).toHaveAttribute("focusable", "false");
      }
    });

    it("Positif: keeps the label as its only text", async () => {
      await renderReady();

      expect(filterButton().textContent).toBe("Produk: semua");
    });

    // jsdom has no layout, so this pins the anchor class; the 375 px check in the browser is the real proof.
    it("Positif: opens the panel from its left edge so it is not cut off on a phone", async () => {
      await renderReady();

      expect(panel()).toHaveClass("left-0");
      expect(panel()).not.toHaveClass("right-0");
    });

    it("Positif: shows that products are chosen and drops that look when none is", async () => {
      const { user } = await renderReady();
      expect(filterButton()).not.toHaveClass("border-indigo-600");

      await user.click(productBox("Produk A"));
      expect(filterButton("Produk: 1 dipilih")).toHaveClass("border-indigo-600");

      await user.click(productBox("Produk A"));
      expect(filterButton()).not.toHaveClass("border-indigo-600");
    });

    it("Edge: unticking every chosen product brings back all sessions and the label", async () => {
      const { user } = await renderReady();

      await user.click(productBox("Produk A"));
      await user.click(productBox("Produk B"));
      expect(filterButton("Produk: 2 dipilih")).toBeInTheDocument();

      await user.click(productBox("Produk B"));
      await user.click(productBox("Produk A"));

      expect(filterButton()).toBeInTheDocument();
      expect(box(/Sesi A1/)).toBeInTheDocument();
      expect(box(/Sesi B1/)).toBeInTheDocument();
      expect(box(/Sesi C1/)).toBeInTheDocument();
    });

    it("Edge: a search and a product together, then Hapus pencarian clears both", async () => {
      const { user } = await renderReady();

      await user.click(productBox("Produk A"));
      await user.type(searchBar(), "Sesi C1");
      expect(screen.getByText("Tidak ada sesi yang cocok dengan pencarian atau filter produk ini.")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Hapus pencarian" }));

      expect(searchBar()).toHaveValue("");
      expect(filterButton()).not.toHaveClass("border-indigo-600");
      expect(screen.getByRole("tab", { name: "Valid (4)" })).toBeInTheDocument();
    });

    // Many products: every one is listed and the panel scrolls instead of growing past the screen.
    it("Edge: lists 30 products in a panel that scrolls", async () => {
      const many = Array.from({ length: 30 }, (_, i) =>
        eligibleSession({
          session_id: `m-${i}`,
          label: `Sesi M${i}`,
          product_id: `p-m${i}`,
          product_name: `Produk M${String(i).padStart(2, "0")}`,
        }),
      );
      render(<ReportBuilderForm gateway={gatewayWith({ eligibleSessions: vi.fn().mockResolvedValue(many) })} />);
      await screen.findByRole("checkbox", { name: /Sesi M0$/ });

      expect(within(panel()).getAllByRole("checkbox", { hidden: true })).toHaveLength(30);
      expect(panel()).toHaveClass("max-h-64", "overflow-y-auto");
      expect(filterButton()).toBeInTheDocument();
    });

    it("Negatif: still works with only one product", async () => {
      const user = userEvent.setup();
      render(<ReportBuilderForm gateway={gatewayWith({ eligibleSessions: vi.fn().mockResolvedValue([a1]) })} />);
      await screen.findByRole("checkbox", { name: /Sesi A1/ });

      expect(within(panel()).getAllByRole("checkbox")).toHaveLength(1);
      await user.click(productBox("Produk A"));
      expect(filterButton("Produk: 1 dipilih")).toBeInTheDocument();
      expect(box(/Sesi A1/)).toBeInTheDocument();
    });
  });

  // The existing automatic/manual filter stays and combines with the product filter.
  it("Positif: keeps the Otomatis / Manual filter next to the new ones", async () => {
    const { user } = await renderReady();
    await user.click(productBox("Produk A"));
    await user.click(productBox("Produk B"));

    await user.click(screen.getByRole("radio", { name: "Manual" }));

    expect(box(/Sesi B1/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Sesi A1/ })).not.toBeInTheDocument();
  });

  // The subtask: picks are kept when the tab or a filter changes. A picked session hidden by the search is still
  // in the report and in "Sesi terpilih", and is still ticked when it comes back.
  it("Positif: keeps the picks while the search, the products and the tab change", async () => {
    const { user } = await renderReady();
    await fillValidForm(user);

    await user.type(searchBar(), "C1");
    await user.click(productBox("Produk C"));
    await user.click(screen.getByRole("tab", { name: /Tidak valid/ }));

    expect(pickedRow("Produk A · Sesi A1")).toBeInTheDocument();
    expect(pickedRow("Produk B · Sesi B1")).toBeInTheDocument();
    expect(createButton()).toBeEnabled();

    await user.click(screen.getByRole("tab", { name: /^Valid/ }));
    await user.clear(searchBar());
    await user.click(productBox("Produk C"));
    expect(box(/Sesi A1/)).toBeChecked();
    expect(box(/Sesi B1/)).toBeChecked();
  });

  // Empty state: a search without hits says so, points to the other tab when that one has the hit, and offers
  // a way back.
  it("Negatif: explains a search without hits and points to the tab that has it", async () => {
    const { user } = await renderReady();

    await user.type(searchBar(), "Sesi X1");

    expect(screen.getByText("Tidak ada sesi yang cocok dengan pencarian atau filter produk ini.")).toBeInTheDocument();
    expect(screen.getByText("Ada 1 sesi yang cocok di tab Tidak valid.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hapus pencarian" }));
    expect(searchBar()).toHaveValue("");
    expect(box(/Sesi A1/)).toBeInTheDocument();
  });

  it("Edge: a search that no tab can answer does not point anywhere", async () => {
    const { user } = await renderReady();

    await user.type(searchBar(), "tidak ada");

    expect(screen.getByText("Tidak ada sesi yang cocok dengan pencarian atau filter produk ini.")).toBeInTheDocument();
    expect(screen.queryByText(/cocok di tab/)).not.toBeInTheDocument();
  });

  // Edge: an empty tab without any search is not a "no hits" message; it says what the tab means.
  it("Edge: an empty Tidak valid tab says every session is valid", async () => {
    const user = userEvent.setup();
    render(<ReportBuilderForm gateway={gatewayWith({ eligibleSessions: vi.fn().mockResolvedValue([a1, b1]) })} />);
    await screen.findByRole("checkbox", { name: /Sesi A1/ });

    await user.click(screen.getByRole("tab", { name: "Tidak valid (0)" }));

    expect(screen.getByText("Tidak ada sesi yang tidak valid.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus pencarian" })).not.toBeInTheDocument();
  });
});
