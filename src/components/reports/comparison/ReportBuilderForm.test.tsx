import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { eligibleSession, reportValidation } from "@/test/reportFixtures";
import type { Role } from "@/types";
import type { EligibleSession, ReportCreateResponse, ReportValidateRequest } from "@/types/reports";

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

  // Negative (AC4): an ineligible session can't be picked, and the server's reason sits next to it.
  it("disables an ineligible session and shows the server's reason next to it", async () => {
    await renderReady();
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

  // Edge (AC13 b): different judges are warned about before Create; the server still decides.
  it("warns when picked sessions were graded by different judges", async () => {
    const { user } = await renderReady();
    await user.click(box(/Sesi A1/));
    expect(screen.queryByText(/LLM judge yang berbeda/)).not.toBeInTheDocument();
    await user.click(box(/Sesi C1/));
    expect(screen.getByText(/LLM judge yang berbeda/)).toBeInTheDocument();
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
    expect(within(group).getByRole("radio", { name: "Kode produk" })).not.toBeChecked();
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
    await user.click(screen.getByRole("radio", { name: "Kode produk" }));
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
