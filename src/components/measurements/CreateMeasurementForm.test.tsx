import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateMeasurementForm } from "./CreateMeasurementForm";
import { ApiError } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";
import type { SummaryResponse } from "@/types/measurement";
import { ToastProvider } from "@/components/ui/Toast";

const { useAuthMock, useSuitesMock, pushMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useSuitesMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("@/hooks/useSuites", () => ({ useSuites: useSuitesMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/lib/providers/providerApi", () => ({
  listProductOptions: vi.fn(),
}));

vi.mock("@/lib/providers/judgeApi", () => ({
  listJudgeOptions: vi.fn(),
}));

vi.mock("@/lib/measurements/measurementApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/measurements/measurementApi")>();
  return {
    ...actual,
    getMeasurementSummary: vi.fn(),
    startMeasurement: vi.fn(),
  };
});

import { listProductOptions } from "@/lib/providers/providerApi";
import { listJudgeOptions } from "@/lib/providers/judgeApi";
import {
  getMeasurementSummary,
  startMeasurement,
} from "@/lib/measurements/measurementApi";

const mockListProductOptions = vi.mocked(listProductOptions);
const mockListJudgeOptions = vi.mocked(listJudgeOptions);
const mockGetMeasurementSummary = vi.mocked(getMeasurementSummary);
const mockStartMeasurement = vi.mocked(startMeasurement);

const MOCK_SUITES: Suite[] = [
  {
    id: "suite-1",
    name: "Suite Hukum Acara Pidana",
    description: null,
    status: "active",
    case_count: 15,
    is_empty: false,
    exportable: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "suite-2",
    name: "Suite Ketenagakerjaan",
    description: null,
    status: "active",
    case_count: 25,
    is_empty: false,
    exportable: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const JUDGE_DEEPSEEK = "8b47374e-0000-4000-8000-000000000001";
const MOCK_JUDGES = [
  {
    id: JUDGE_DEEPSEEK,
    name: "DeepSeek V4-Flash",
    provider_type: "openai_compatible" as const,
    model_name: "deepseek-v4-flash",
  },
];

const MOCK_SUMMARY: SummaryResponse = {
  case_count: 40,
  total_calls: 120,
  case_filter: "both",
  repeat_count: 3,
  estimated_cost_idr: "250000.00",
  remaining_budget_idr: "500000.00",
};

describe("CreateMeasurementForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: { id: "u-1", name: "Admin", email: "admin@veritask.id", role: "admin" },
    });
    useSuitesMock.mockReturnValue({
      status: "ready",
      suites: MOCK_SUITES,
      reload: vi.fn(),
    });
    mockListJudgeOptions.mockResolvedValue(MOCK_JUDGES);
    mockListProductOptions.mockResolvedValue([
      { id: "prod-gemini", name: "Gemini 1.5 Pro", measurement_type: "automatic" },
      { id: "prod-deepseek", name: "DeepSeek-V3", measurement_type: "automatic" },
    ]);
  });

  async function pilihPenilai(user: ReturnType<typeof userEvent.setup>) {
    const judgeSelect = await screen.findByRole("combobox", { name: /Provider Penilai/i });
    await user.selectOptions(judgeSelect, JUDGE_DEEPSEEK);
  }

  function renderForm() {
    return render(
      <ToastProvider>
        <CreateMeasurementForm />
      </ToastProvider>,
    );
  }

  it("renders all sequential steps and form controls", async () => {
    renderForm();

    expect(screen.getByText("1. Informasi Sesi")).toBeInTheDocument();
    expect(screen.getByText("2. Pilih Suite Kasus & Filter")).toBeInTheDocument();
    expect(screen.getByText("3. Pilih Produk AI Otomatis")).toBeInTheDocument();
    expect(screen.getByText("4. Pengulangan & Penilai LLM")).toBeInTheDocument();
    expect(screen.getByText("5. Ringkasan & Perkiraan Biaya")).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i),
    ).toBeInTheDocument();
    // Purpose starts unselected
    expect(screen.getByRole("button", { name: "Uji Coba" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Pengukuran Resmi" })).toHaveAttribute("aria-pressed", "false");
    // Case filter starts with "Semua (Dev & Test)" selected
    expect(screen.getByRole("button", { name: "Semua (Dev & Test)" })).toHaveAttribute("aria-pressed", "true");

    expect(await screen.findByText("Suite Hukum Acara Pidana")).toBeInTheDocument();
    expect(screen.getByText("Suite Ketenagakerjaan")).toBeInTheDocument();

    const judgeSelect = await screen.findByRole("combobox", { name: /Provider Penilai/i });
    expect(judgeSelect).toBeEnabled();
    expect(judgeSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "DeepSeek V4-Flash" })).toHaveValue(JUDGE_DEEPSEEK);
    expect(screen.queryByText(/PBI-14/i)).not.toBeInTheDocument();
  });

  it("handles suite selection, Select All, and Clear Selection", async () => {
    const user = userEvent.setup();
    renderForm();

    const suite1Check = await screen.findByRole("checkbox", {
      name: "Suite Hukum Acara Pidana",
    });
    const suite2Check = screen.getByRole("checkbox", {
      name: "Suite Ketenagakerjaan",
    });

    expect(suite1Check).not.toBeChecked();
    expect(suite2Check).not.toBeChecked();
    expect(screen.getByText("0 suite dipilih.")).toBeInTheDocument();

    // Toggle individual checkbox on and off
    await user.click(suite1Check);
    expect(suite1Check).toBeChecked();
    expect(screen.getByText("1 suite dipilih.")).toBeInTheDocument();

    await user.click(suite1Check);
    expect(suite1Check).not.toBeChecked();
    expect(screen.getByText("0 suite dipilih.")).toBeInTheDocument();

    // "Pilih Semua"
    await user.click(screen.getByRole("button", { name: "Pilih Semua" }));
    expect(suite1Check).toBeChecked();
    expect(suite2Check).toBeChecked();
    expect(screen.getByText("2 suite dipilih.")).toBeInTheDocument();

    // "Hapus Pilihan"
    await user.click(screen.getByRole("button", { name: "Hapus Pilihan" }));
    expect(suite1Check).not.toBeChecked();
    expect(suite2Check).not.toBeChecked();
    expect(screen.getByText("0 suite dipilih.")).toBeInTheDocument();
  });

  it("handles suite loading, error, and empty states", () => {
    // Loading state
    useSuitesMock.mockReturnValueOnce({
      status: "loading",
      suites: [],
      reload: vi.fn(),
    });
    const { unmount: unmount1 } = renderForm();
    expect(screen.getByTestId("suites-loading")).toBeInTheDocument();
    unmount1();

    // Error state with retry
    const reloadMock = vi.fn();
    useSuitesMock.mockReturnValueOnce({
      status: "error",
      suites: [],
      reload: reloadMock,
    });
    const { unmount: unmount2 } = renderForm();
    expect(screen.getByTestId("suites-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
    unmount2();

    // Empty state
    useSuitesMock.mockReturnValueOnce({
      status: "ready",
      suites: [],
      reload: vi.fn(),
    });
    renderForm();
    expect(screen.getByTestId("suites-empty")).toBeInTheDocument();
  });

  it("displays non-blocking warning when repeat count is 1", async () => {
    const user = userEvent.setup();
    renderForm();

    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    expect(screen.queryByTestId("repeat-single-warning")).not.toBeInTheDocument();

    await user.clear(repeatInput);
    await user.type(repeatInput, "1");

    expect(screen.getByTestId("repeat-single-warning")).toBeInTheDocument();
    expect(
      screen.getByText(/1x pengulangan disarankan hanya jika model berjalan/i),
    ).toBeInTheDocument();
  });

  it("handles deleting and typing new values in repeat count smoothly", async () => {
    const user = userEvent.setup();
    renderForm();

    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    expect(repeatInput).toHaveValue(3);

    // Typing a valid number
    await user.clear(repeatInput);
    await user.type(repeatInput, "4");
    expect(repeatInput).toHaveValue(4);
  });

  it("requests cost summary and displays summary details", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);

    renderForm();

    // Select a suite
    await user.click(
      screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }),
    );

    // Select a product
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");

    // Click "Tinjau Ringkasan Biaya"
    const summaryBtn = screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" });
    expect(summaryBtn).toBeEnabled();
    await user.click(summaryBtn);

    expect(mockGetMeasurementSummary).toHaveBeenCalledWith({
      suite_ids: ["suite-1"],
      case_filter: "both",
      repeat_count: 3,
      product_id: "prod-gemini",
    });

    await waitFor(() => {
      expect(screen.getByTestId("summary-card")).toBeInTheDocument();
    });

    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("Rp 250.000")).toBeInTheDocument();
  });

  it("disables Mulai button and shows alert when budget is exceeded (AC5)", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockRejectedValue(
      new ApiError(
        422,
        "BUDGET_EXCEEDED",
        "Perkiraan biaya melebihi sisa anggaran",
        null,
        [],
        null,
        {
          product_name: "Gemini 1.5 Pro",
          remaining_budget_idr: "50000.00",
          estimated_cost_idr: "250000.00",
        },
      ),
    );

    renderForm();

    // Fill form
    await user.type(
      screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i),
      "Tes Batas Anggaran",
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }),
    );
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");

    // Request summary
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));

    await waitFor(() => {
      expect(screen.getByTestId("summary-budget-exceeded")).toBeInTheDocument();
    });

    expect(screen.getByText(/Anggaran Produk Tidak Mencukupi/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Perkiraan biaya melebihi sisa anggaran produk Gemini 1.5 Pro/i),
    ).toBeInTheDocument();

    // Mulai button must be disabled per AC5
    const startBtn = screen.getByRole("button", { name: "Mulai Pengukuran" });
    expect(startBtn).toBeDisabled();
  });

  it("discards stale summary when inputs change while summary request is in flight", async () => {
    const user = userEvent.setup();
    let resolveSummary!: (value: SummaryResponse) => void;
    mockGetMeasurementSummary.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSummary = resolve;
        }),
    );

    renderForm();

    const suite1Check = screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" });
    await user.click(suite1Check);
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");

    // Click fetch summary (in flight)
    const summaryBtn = screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" });
    await user.click(summaryBtn);
    expect(screen.getByRole("button", { name: "Menghitung…" })).toBeInTheDocument();

    // While in flight, user unchecks suite1
    await user.click(suite1Check);

    // Re-check suite1: button must not be stuck on "Menghitung…"
    await user.click(suite1Check);
    expect(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" })).toBeEnabled();

    // Stale summary now resolves
    await act(async () => {
      resolveSummary(MOCK_SUMMARY);
    });

    // Summary must NOT be saved and Mulai button must remain disabled
    expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mulai Pengukuran" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" })).toBeEnabled();
  });

  it("discards stale summary error when inputs change while summary request is in flight", async () => {
    const user = userEvent.setup();
    let rejectSummary!: (err: unknown) => void;
    mockGetMeasurementSummary.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectSummary = reject;
        }),
    );

    renderForm();

    const suite1Check = screen.getByRole("checkbox", {
      name: "Suite Hukum Acara Pidana",
    });
    await user.click(suite1Check);

    const productSelect = await screen.findByRole("combobox", {
      name: /Pilih Produk AI/i,
    });
    await user.selectOptions(productSelect, "prod-gemini");

    const summaryBtn = screen.getByRole("button", {
      name: "Tinjau Ringkasan Biaya",
    });
    await user.click(summaryBtn);

    // While in flight, user unchecks suite1
    await user.click(suite1Check);

    // Re-check suite1: button must be enabled
    await user.click(suite1Check);
    expect(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" })).toBeEnabled();

    // Stale summary now rejects with an error
    await act(async () => {
      rejectSummary(new Error("Network error"));
    });

    // Summary error must NOT be shown
    expect(screen.queryByText("Network error")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" })).toBeEnabled();
  });

  it("handles confirmation modal and starts measurement session successfully", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    mockStartMeasurement.mockResolvedValue({
      session_id: "sess-999",
      status: "queued",
      queued_at: "2026-11-03T12:00:00Z",
    });

    renderForm();

    // Fill label
    const labelInput = screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i);
    await user.type(labelInput, "Pengukuran Resmi Q4");

    // Select "Pengukuran Resmi"
    await user.click(screen.getByRole("button", { name: "Pengukuran Resmi" }));

    // Select suite
    await user.click(
      screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }),
    );

    // Select product
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");
    await pilihPenilai(user);

    // Get summary first
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
    await waitFor(() => {
      expect(screen.getByTestId("summary-card")).toBeInTheDocument();
    });

    // Start button should now be enabled
    const startBtn = screen.getByRole("button", { name: "Mulai Pengukuran" });
    expect(startBtn).toBeEnabled();

    // Click start to open confirm dialog
    await user.click(startBtn);
    expect(screen.getByTestId("start-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Pengukuran Resmi Q4/)).toBeInTheDocument();
    expect(screen.getByText(/120 panggilan/i)).toBeInTheDocument();

    // Confirm start
    const confirmBtn = screen.getByRole("button", { name: "Ya, Mulai Pengukuran" });
    await user.click(confirmBtn);

    expect(mockStartMeasurement).toHaveBeenCalledWith({
      suite_ids: ["suite-1"],
      case_filter: "both",
      repeat_count: 3,
      product_id: "prod-gemini",
      label: "Pengukuran Resmi Q4",
      purpose: "official",
      judge_provider_id: JUDGE_DEEPSEEK,
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/runs/sess-999");
    });
  });

  it("keeps Mulai off until a judge provider is chosen, then turns it on", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    renderForm();
    await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i), "Sesi Penilai");
    await user.click(screen.getByRole("button", { name: "Uji Coba" }));
    await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
    await screen.findByTestId("summary-card");
    const startBtn = screen.getByRole("button", { name: "Mulai Pengukuran" });

    // Everything else is filled, only the judge is missing.
    expect(startBtn).toBeDisabled();

    await pilihPenilai(user);

    expect(startBtn).toBeEnabled();
  });

  it("keeps Mulai off and explains when no judge provider is active", async () => {
    const user = userEvent.setup();
    mockListJudgeOptions.mockResolvedValue([]);
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    renderForm();
    await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i), "Sesi Kosong");
    await user.click(screen.getByRole("button", { name: "Uji Coba" }));
    await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
    await screen.findByTestId("summary-card");

    expect(await screen.findByText(/Belum ada provider yang aktif/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "halaman Provider" })).toHaveAttribute(
      "href",
      "/admin/providers",
    );
    expect(screen.getByRole("button", { name: "Mulai Pengukuran" })).toBeDisabled();
  });

  it("shows the server message and stays on the page when the chosen judge is refused", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    mockStartMeasurement.mockRejectedValue(
      new ApiError(
        422,
        "JUDGE_PROVIDER_NOT_AVAILABLE",
        "Provider penilai tidak tersedia atau nonaktif.",
        "judge_provider_id",
      ),
    );
    renderForm();
    await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i), "Sesi Ditolak");
    await user.click(screen.getByRole("button", { name: "Uji Coba" }));
    await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");
    await pilihPenilai(user);
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
    await screen.findByTestId("summary-card");
    await user.click(screen.getByRole("button", { name: "Mulai Pengukuran" }));

    await user.click(screen.getByRole("button", { name: "Ya, Mulai Pengukuran" }));

    expect(
      await screen.findByText("Provider penilai tidak tersedia atau nonaktif."),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates back to /runs when Batal is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    const cancelBtn = screen.getByRole("button", { name: "Batal" });
    await user.click(cancelBtn);

    expect(pushMock).toHaveBeenCalledWith("/runs");
  });

  it("handles purpose and case filter changes", async () => {
    const user = userEvent.setup();
    renderForm();

    const trialBtn = screen.getByRole("button", { name: "Uji Coba" });
    const officialBtn = screen.getByRole("button", { name: "Pengukuran Resmi" });

    // Initially neither purpose is selected
    expect(trialBtn).toHaveAttribute("aria-pressed", "false");
    expect(officialBtn).toHaveAttribute("aria-pressed", "false");

    // Select "Uji Coba"
    await user.click(trialBtn);
    expect(trialBtn).toHaveAttribute("aria-pressed", "true");
    expect(officialBtn).toHaveAttribute("aria-pressed", "false");

    // Change purpose to "Pengukuran Resmi"
    await user.click(officialBtn);
    expect(officialBtn).toHaveAttribute("aria-pressed", "true");
    expect(trialBtn).toHaveAttribute("aria-pressed", "false");

    // Change case filter to "Hanya Dev"
    const devFilterBtn = screen.getByRole("button", { name: "Hanya Dev" });
    await user.click(devFilterBtn);
    expect(devFilterBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("invalidates summary when inputs change after summary is loaded", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    renderForm();

    const suite1Check = screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" });
    await user.click(suite1Check);

    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");

    // Fetch summary
    const summaryBtn = screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" });
    await user.click(summaryBtn);
    expect(await screen.findByTestId("summary-card")).toBeInTheDocument();

    // Change product -> invalidates summary
    await user.selectOptions(productSelect, "prod-deepseek");
    expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();

    // Re-fetch summary
    await user.click(summaryBtn);
    expect(await screen.findByTestId("summary-card")).toBeInTheDocument();

    // Toggle suite -> invalidates summary
    await user.click(suite1Check);
    expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();

    // Re-select suite and re-fetch
    await user.click(suite1Check);
    await user.click(summaryBtn);
    expect(await screen.findByTestId("summary-card")).toBeInTheDocument();

    // Change case filter -> invalidates summary
    const testFilterBtn = screen.getByRole("button", { name: "Hanya Test" });
    await user.click(testFilterBtn);
    expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();

    // Re-fetch and change repeat count -> invalidates summary
    await user.click(summaryBtn);
    expect(await screen.findByTestId("summary-card")).toBeInTheDocument();
    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    fireEvent.change(repeatInput, { target: { value: "4" } });
    expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();
  });

  it("handles summary fetch error states (Error and non-Error)", async () => {
    const user = userEvent.setup();
    renderForm();

    const summaryBtn = screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" });
    // Guard check when no suite / product selected
    fireEvent.click(summaryBtn);
    expect(mockGetMeasurementSummary).not.toHaveBeenCalled();

    // Guard check when suite selected, but product is not yet selected
    await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
    fireEvent.click(summaryBtn);
    expect(mockGetMeasurementSummary).not.toHaveBeenCalled();

    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");

    // 1. Error instance
    mockGetMeasurementSummary.mockRejectedValueOnce(new Error("Timeout server"));
    await user.click(summaryBtn);
    expect(await screen.findByText("Timeout server")).toBeInTheDocument();

    // 2. Error instance with empty message
    mockGetMeasurementSummary.mockRejectedValueOnce(new Error(""));
    await user.click(summaryBtn);
    expect(await screen.findByText("Gagal memuat ringkasan pengukuran.")).toBeInTheDocument();

    // 3. Non-Error throw
    mockGetMeasurementSummary.mockRejectedValueOnce("Unknown failure");
    await user.click(summaryBtn);
    expect(await screen.findByText("Gagal memuat ringkasan pengukuran.")).toBeInTheDocument();
  });

  it("handles start dialog cancel, Escape key, errors, and budget exceeded in dialog", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    renderForm();

    // Fill form
    await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i), "Sesi Uji");
    await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");
    await pilihPenilai(user);

    // Fetch summary
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
    await screen.findByTestId("summary-card");

    // Start button remains disabled until purpose is selected
    const startBtn = screen.getByRole("button", { name: "Mulai Pengukuran" });
    expect(startBtn).toBeDisabled();

    // Select purpose
    await user.click(screen.getByRole("button", { name: "Uji Coba" }));
    expect(startBtn).toBeEnabled();

    // Open confirm dialog
    await user.click(startBtn);
    const dialog = screen.getByTestId("start-confirm-dialog");
    expect(dialog).toBeInTheDocument();

    // Close via Escape / onCancel event
    await act(async () => {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    expect(screen.queryByTestId("start-confirm-dialog")).not.toBeInTheDocument();

    // Re-open dialog and click "Batal"
    await user.click(startBtn);
    const dialog2 = screen.getByTestId("start-confirm-dialog");
    const dialogCancelBtn = within(dialog2).getByRole("button", { name: "Batal" });
    await user.click(dialogCancelBtn);
    expect(screen.queryByTestId("start-confirm-dialog")).not.toBeInTheDocument();

    // Re-open dialog
    await user.click(startBtn);
    const dialog3 = screen.getByTestId("start-confirm-dialog");

    // Cancel is ignored while isStarting is in flight
    let rejectStart!: (reason: unknown) => void;
    mockStartMeasurement.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectStart = reject;
        }),
    );
    const confirmBtn = within(dialog3).getByRole("button", { name: "Ya, Mulai Pengukuran" });
    await user.click(confirmBtn);
    expect(screen.getByRole("button", { name: "Memulai…" })).toBeInTheDocument();
    await act(async () => {
      dialog3.dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    expect(screen.getByTestId("start-confirm-dialog")).toBeInTheDocument();

    // 1. Error instance when starting
    await act(async () => {
      rejectStart(new Error("Gagal memulai worker"));
    });
    expect(await screen.findByText("Gagal memulai worker")).toBeInTheDocument();

    // Error with empty message
    mockStartMeasurement.mockRejectedValueOnce(new Error(""));
    await user.click(confirmBtn);
    expect(await screen.findByText("Gagal memulai pengukuran.")).toBeInTheDocument();

    // 2. Non-error string when starting
    mockStartMeasurement.mockRejectedValueOnce("Unknown string");
    await user.click(confirmBtn);
    expect(await screen.findByText("Gagal memulai pengukuran.")).toBeInTheDocument();

    // 3. BUDGET_EXCEEDED when starting
    const budgetError = new ApiError(
      422,
      "BUDGET_EXCEEDED",
      "Budget exceeded",
      null,
      [],
      null,
      {
        product_name: "Gemini 1.5 Pro",
        remaining_budget_idr: "10000.00",
        estimated_cost_idr: "250000.00",
      },
    );
    mockStartMeasurement.mockRejectedValueOnce(budgetError);
    await user.click(confirmBtn);

    // Dialog closes and budget alert appears
    await waitFor(() => {
      expect(screen.queryByTestId("start-confirm-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("summary-budget-exceeded")).toBeInTheDocument();
    });
  });

  it("opens the confirmation with showModal when the browser has it", async () => {
    const user = userEvent.setup();
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { value: showModal, configurable: true });

    try {
      mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
      renderForm();

      await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Perdata v1.2/i), "Sesi Modal");
      await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
      const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
      await user.selectOptions(productSelect, "prod-gemini");
      await pilihPenilai(user);
      await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
      await screen.findByTestId("summary-card");

      // Select purpose so canStart is true
      await user.click(screen.getByRole("button", { name: "Uji Coba" }));

      await user.click(screen.getByRole("button", { name: "Mulai Pengukuran" }));

      expect(showModal).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    }
  });

  it("handles repeat count instant UX typing, NaN reset to default 3, and blur fallback", () => {
    renderForm();
    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);

    // Initial valid value is 3
    expect(repeatInput).toHaveValue(3);

    // Typing a new digit (e.g. typing 4 when 2 was there) instantly becomes 4
    fireEvent.change(repeatInput, { target: { value: "24" } });
    expect(repeatInput).toHaveValue(4);

    // Deleting value leaves it temporarily empty
    fireEvent.change(repeatInput, { target: { value: "" } });
    expect(repeatInput).toHaveValue(null);

    // On blur, empty resets to default 3
    fireEvent.blur(repeatInput);
    expect(repeatInput).toHaveValue(3);

    // Empty or non-numeric resets to default 3 on blur
    fireEvent.change(repeatInput, { target: { value: "" } });
    expect(repeatInput).toHaveValue(null);
    fireEvent.blur(repeatInput);
    expect(repeatInput).toHaveValue(3);

    // Multi-digit where last digit is outside 1-5 (e.g. 29) clamps to 5
    fireEvent.change(repeatInput, { target: { value: "29" } });
    expect(repeatInput).toHaveValue(5);

    // Value exceeding 5 is clamped to 5
    fireEvent.change(repeatInput, { target: { value: "9" } });
    expect(repeatInput).toHaveValue(5);

    // Value below 1 is clamped to 1
    fireEvent.change(repeatInput, { target: { value: "0" } });
    expect(repeatInput).toHaveValue(1);
  });
});
