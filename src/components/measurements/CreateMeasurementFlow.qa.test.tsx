/**
 * QA alur buat pengukuran, SCRUM-76 SCRUM-213.
 *
 * Berbeda dari CreateMeasurementForm.test.tsx yang mem-mock measurementApi, tes di sini
 * membiarkan measurementApi dan apiFetch berjalan dan hanya mengganti fetch dengan server
 * palsu yang menjawab seperti server asli. Jadi yang diuji adalah bentuk request yang
 * dikirim, bentuk galat yang dibaca, dan apa yang dilihat pengguna.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateMeasurementForm } from "./CreateMeasurementForm";
import { BASE_URL } from "@/lib/apiClient";
import { formatRupiah } from "@/lib/providers/format";
import { ToastProvider } from "@/components/ui/Toast";
import type { Suite } from "@/types/suite";
import {
  buildServerError,
  buildStartResponse,
  buildSummaryResponse,
  jsonResponse,
  SESSION_ID,
} from "@/test/measurementFixtures";

const { useAuthMock, useSuitesMock, pushMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useSuitesMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("@/hooks/useSuites", () => ({ useSuites: useSuitesMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/lib/providers/providerApi", () => ({ listProductOptions: vi.fn() }));

import { listProductOptions } from "@/lib/providers/providerApi";

const SUMMARY_URL = `${BASE_URL}/measurements/summary`;
const START_URL = `${BASE_URL}/measurements`;

const SUITES: Suite[] = [
  {
    id: "suite-1",
    name: "Suite Ketenagakerjaan",
    description: null,
    status: "active",
    case_count: 10,
    is_empty: false,
    exportable: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

type Handler = () => Response | Promise<Response>;

const fetchMock = vi.fn<typeof fetch>();

/** Server palsu: jawaban bawaan sukses, tiap tes mengganti yang ingin diuji. */
function stubServer({ summary, start }: { summary?: Handler; start?: Handler } = {}) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url === SUMMARY_URL) return (summary ?? (() => jsonResponse(200, buildSummaryResponse())))();
    if (url === START_URL) return (start ?? (() => jsonResponse(201, buildStartResponse())))();
    throw new Error(`Panggilan tak terduga ke ${url}`);
  });
}

/** Intl memakai spasi tak terputus; jest-dom hanya menormalkan teks elemen, bukan teks yang diharapkan. */
function rupiah(value: string) {
  return formatRupiah(value).replace(/\s/g, " ");
}

function callsTo(url: string) {
  return fetchMock.mock.calls.filter(([input]) => String(input) === url);
}

function bodyOf(call: Parameters<typeof fetch>) {
  return JSON.parse(String(call[1]?.body));
}

type User = ReturnType<typeof userEvent.setup>;

async function fillForm(user: User, label = "Run Oktober AiYU") {
  await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i), label);
  await user.click(screen.getByRole("button", { name: "Pengukuran Resmi" }));
  await user.click(screen.getByRole("checkbox", { name: "Suite Ketenagakerjaan" }));
  const product = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
  await user.selectOptions(product, "prod-aiyu");
}

async function reviewSummary(user: User) {
  await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
}

async function openConfirm(user: User) {
  await user.click(screen.getByRole("button", { name: "Mulai Pengukuran" }));
}

describe("CreateMeasurementForm against a server-shaped API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: { id: "u-1", name: "Admin", email: "admin@veritask.id", role: "admin" },
    });
    useSuitesMock.mockReturnValue({ status: "ready", suites: SUITES, reload: vi.fn() });
    vi.mocked(listProductOptions).mockResolvedValue([
      { id: "prod-aiyu", name: "AiYU", measurement_type: "automatic" },
    ]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderForm() {
    return render(
      <ToastProvider>
        <CreateMeasurementForm />
      </ToastProvider>,
    );
  }

  // Positif
  it("sends the summary and start requests in the shape the server expects, then opens the new session", async () => {
    const user = userEvent.setup();
    stubServer();
    renderForm();

    await fillForm(user, "  Run Oktober AiYU  ");
    await reviewSummary(user);
    await screen.findByTestId("summary-card");
    await openConfirm(user);
    await user.click(screen.getByRole("button", { name: "Ya, Mulai Pengukuran" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/runs/${SESSION_ID}`));
    const [summaryCall] = callsTo(SUMMARY_URL);
    expect(summaryCall[1]?.method).toBe("POST");
    expect(summaryCall[1]?.credentials).toBe("include");
    expect(bodyOf(summaryCall)).toEqual({
      suite_ids: ["suite-1"],
      case_filter: "both",
      repeat_count: 3,
      product_id: "prod-aiyu",
    });
    const [startCall] = callsTo(START_URL);
    expect(startCall[1]?.method).toBe("POST");
    expect(bodyOf(startCall)).toEqual({
      suite_ids: ["suite-1"],
      case_filter: "both",
      repeat_count: 3,
      product_id: "prod-aiyu",
      label: "Run Oktober AiYU",
      purpose: "official",
    });
  });

  it("shows the calls and the cost the server computed in the summary and the confirmation", async () => {
    const user = userEvent.setup();
    stubServer();
    renderForm();

    await fillForm(user);
    await reviewSummary(user);
    const card = await screen.findByTestId("summary-card");
    await openConfirm(user);

    expect(card).toHaveTextContent("30");
    expect(card).toHaveTextContent(rupiah("883.01"));
    expect(screen.getByText(/30 panggilan/)).toBeInTheDocument();
  });

  // Negatif
  it("keeps Mulai off and shows the amounts when the server sends BUDGET_EXCEEDED at the top level", async () => {
    const user = userEvent.setup();
    stubServer({
      summary: () =>
        jsonResponse(
          422,
          buildServerError("BUDGET_EXCEEDED", "Perkiraan biaya melebihi sisa anggaran.", {
            product_name: "AiYU",
            remaining_budget_idr: "100.00",
            estimated_cost_idr: "883.01",
          }),
        ),
    });
    renderForm();

    await fillForm(user);
    await reviewSummary(user);

    const alert = await screen.findByTestId("summary-budget-exceeded");
    expect(alert).toHaveTextContent("AiYU");
    expect(alert).toHaveTextContent(rupiah("100.00"));
    expect(alert).toHaveTextContent(rupiah("883.01"));
    expect(screen.getByRole("button", { name: "Mulai Pengukuran" })).toBeDisabled();
  });

  it("closes the confirmation and shows the budget card when Mulai is refused with BUDGET_EXCEEDED", async () => {
    const user = userEvent.setup();
    stubServer({
      start: () =>
        jsonResponse(
          422,
          buildServerError("BUDGET_EXCEEDED", "Perkiraan biaya melebihi sisa anggaran.", {
            product_name: "AiYU",
            remaining_budget_idr: "100.00",
            estimated_cost_idr: "883.01",
          }),
        ),
    });
    renderForm();

    await fillForm(user);
    await reviewSummary(user);
    await screen.findByTestId("summary-card");
    await openConfirm(user);
    await user.click(screen.getByRole("button", { name: "Ya, Mulai Pengukuran" }));

    const alert = await screen.findByTestId("summary-budget-exceeded");
    expect(alert).toHaveTextContent(rupiah("100.00"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not enable Mulai when the label has only spaces", async () => {
    const user = userEvent.setup();
    stubServer();
    renderForm();

    await fillForm(user, "   ");
    await reviewSummary(user);
    await screen.findByTestId("summary-card");

    expect(screen.getByRole("button", { name: "Mulai Pengukuran" })).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i), "Run Oktober");
    expect(screen.getByRole("button", { name: "Mulai Pengukuran" })).toBeEnabled();
  });

  // Edge
  it("sends one start request when the confirm button is clicked twice while the first is in flight", async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => {};
    stubServer({ start: () => new Promise<Response>((resolve) => (release = resolve)) });
    renderForm();

    await fillForm(user);
    await reviewSummary(user);
    await screen.findByTestId("summary-card");
    await openConfirm(user);
    const confirm = screen.getByRole("button", { name: "Ya, Mulai Pengukuran" });
    await user.dblClick(confirm);
    release(jsonResponse(201, buildStartResponse()));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/runs/${SESSION_ID}`));
    expect(callsTo(START_URL)).toHaveLength(1);
  });

  describe.each([
    {
      status: 422,
      code: "PRODUCT_NOT_AUTOMATIC",
      message: "Produk ini dicatat manual, jadi tidak bisa diukur otomatis.",
    },
    {
      status: 422,
      code: "NO_ELIGIBLE_CASES",
      message: "Tidak ada kasus yang layak untuk filter ini.",
    },
    {
      status: 500,
      code: "PRICE_NOT_CONFIGURED",
      message: "Harga model belum diatur di server.",
    },
  ])("when the server answers $code", ({ status, code, message }) => {
    it("tells the person the server message while reviewing the summary, not the raw code", async () => {
      const user = userEvent.setup();
      stubServer({ summary: () => jsonResponse(status, buildServerError(code, message)) });
      renderForm();

      await fillForm(user);
      await reviewSummary(user);

      const alert = await screen.findByTestId("summary-error");
      expect(alert).toHaveTextContent(message);
      expect(alert).not.toHaveTextContent(code);
      expect(screen.getByRole("button", { name: "Mulai Pengukuran" })).toBeDisabled();
    });

    it("tells the person the server message when Mulai is refused, keeps the dialog open and does not leave the page", async () => {
      const user = userEvent.setup();
      stubServer({ start: () => jsonResponse(status, buildServerError(code, message)) });
      renderForm();

      await fillForm(user);
      await reviewSummary(user);
      await screen.findByTestId("summary-card");
      await openConfirm(user);
      await user.click(screen.getByRole("button", { name: "Ya, Mulai Pengukuran" }));

      const dialog = await screen.findByTestId("start-confirm-dialog");
      const alert = await within(dialog).findByRole("alert");
      expect(alert).toHaveTextContent(message);
      expect(alert).not.toHaveTextContent(code);
      expect(within(dialog).getByRole("button", { name: "Ya, Mulai Pengukuran" })).toBeEnabled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
