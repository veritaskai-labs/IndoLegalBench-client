import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

vi.mock("@/lib/measurements/measurementApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/measurements/measurementApi")>();
  return {
    ...actual,
    getMeasurementSummary: vi.fn(),
    startMeasurement: vi.fn(),
  };
});

import { listProductOptions } from "@/lib/providers/providerApi";
import {
  getMeasurementSummary,
  startMeasurement,
} from "@/lib/measurements/measurementApi";

const mockListProductOptions = vi.mocked(listProductOptions);
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
    mockListProductOptions.mockResolvedValue([
      { id: "prod-gemini", name: "Gemini 1.5 Pro", measurement_type: "automatic" },
      { id: "prod-deepseek", name: "DeepSeek-V3", measurement_type: "automatic" },
    ]);
  });

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
      screen.getByPlaceholderText(/Contoh: Evaluasi Gemini Flash/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Pengukuran Resmi")).toBeChecked();

    expect(await screen.findByText("Suite Hukum Acara Pidana")).toBeInTheDocument();
    expect(screen.getByText("Suite Ketenagakerjaan")).toBeInTheDocument();

    const judgeSelect = screen.getByLabelText(/Provider Penilai/i);
    expect(judgeSelect).toBeInTheDocument();
    expect(within(judgeSelect).getByText("DeepSeek V4-Flash (Default)")).toBeInTheDocument();
    expect(within(judgeSelect).getByText("DeepSeek V4-Pro")).toBeInTheDocument();
    expect(within(judgeSelect).getByText("Google Gemini 3.5 Flash-Lite")).toBeInTheDocument();
    expect(within(judgeSelect).getByText("Google Gemini 3.8 Flash")).toBeInTheDocument();
    expect(within(judgeSelect).getByText("Google Gemini 2.5 Pro")).toBeInTheDocument();

    // Verify AC1: No "Duplikat sesi" button
    expect(screen.queryByText(/duplikat sesi/i)).not.toBeInTheDocument();
  });

  it("handles suite selection, Select All, and Clear Selection", async () => {
    const user = userEvent.setup();
    renderForm();

    const suite1Check = screen.getByRole("checkbox", {
      name: "Suite Hukum Acara Pidana",
    });
    const suite2Check = screen.getByRole("checkbox", {
      name: "Suite Ketenagakerjaan",
    });

    expect(suite1Check).not.toBeChecked();
    expect(suite2Check).not.toBeChecked();

    // Select individual suite
    await user.click(suite1Check);
    expect(suite1Check).toBeChecked();
    expect(screen.getByText("1 suite dipilih.")).toBeInTheDocument();

    // Toggle off individual suite
    await user.click(suite1Check);
    expect(suite1Check).not.toBeChecked();
    expect(screen.getByText("0 suite dipilih.")).toBeInTheDocument();

    // Re-select suite
    await user.click(suite1Check);

    // Select all suites
    await user.click(screen.getByRole("button", { name: "Pilih Semua" }));
    expect(suite1Check).toBeChecked();
    expect(suite2Check).toBeChecked();
    expect(screen.getByText("2 suite dipilih.")).toBeInTheDocument();

    // Clear selection
    await user.click(screen.getByRole("button", { name: "Hapus Pilihan" }));
    expect(suite1Check).not.toBeChecked();
    expect(suite2Check).not.toBeChecked();
    expect(screen.getByText("0 suite dipilih.")).toBeInTheDocument();
  });

  it("handles suite loading, error, and empty states", () => {
    // Loading
    useSuitesMock.mockReturnValueOnce({ status: "loading", suites: [], reload: vi.fn() });
    const { unmount } = renderForm();
    expect(screen.getByTestId("suites-loading")).toBeInTheDocument();
    unmount();

    // Error
    useSuitesMock.mockReturnValueOnce({ status: "error", suites: [], reload: vi.fn() });
    const { unmount: unmountErr } = renderForm();
    expect(screen.getByTestId("suites-error")).toBeInTheDocument();
    unmountErr();

    // Empty
    useSuitesMock.mockReturnValueOnce({ status: "ready", suites: [], reload: vi.fn() });
    renderForm();
    expect(screen.getByTestId("suites-empty")).toBeInTheDocument();
  });

  it("displays non-blocking warning when repeat count is 1", async () => {
    renderForm();

    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    expect(repeatInput).toHaveValue(3);
    expect(screen.queryByTestId("repeat-single-warning")).not.toBeInTheDocument();

    fireEvent.change(repeatInput, { target: { value: "1" } });
    expect(screen.getByTestId("repeat-single-warning")).toBeInTheDocument();
    expect(
      screen.getByText(/1x pengulangan disarankan hanya jika model berjalan dalam mode deterministik/i),
    ).toBeInTheDocument();
  });

  it("handles deleting and typing new values in repeat count smoothly", async () => {
    renderForm();

    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    expect(repeatInput).toHaveValue(3);

    // Can delete to empty without forcing to 1
    fireEvent.change(repeatInput, { target: { value: "" } });
    expect(repeatInput).toHaveValue(null);

    // Can type 4 into empty input
    fireEvent.change(repeatInput, { target: { value: "4" } });
    expect(repeatInput).toHaveValue(4);

    // Typing a new digit without clearing first updates to the newly typed digit (e.g. "42" -> 2)
    fireEvent.change(repeatInput, { target: { value: "42" } });
    expect(repeatInput).toHaveValue(2);

    // Blur while empty resets to default 3
    fireEvent.change(repeatInput, { target: { value: "" } });
    fireEvent.blur(repeatInput);
    expect(repeatInput).toHaveValue(3);
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
      screen.getByPlaceholderText(/Contoh: Evaluasi Gemini Flash/i),
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
    const labelInput = screen.getByPlaceholderText(/Contoh: Evaluasi Gemini Flash/i);
    await user.type(labelInput, "Pengukuran Resmi Q4");

    // Select suite
    await user.click(
      screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }),
    );

    // Select product
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");

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
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/runs/sess-999");
    });
  });

  it("navigates back to /runs when Batal is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    const cancelBtn = screen.getByRole("button", { name: "Batal" });
    await user.click(cancelBtn);

    expect(pushMock).toHaveBeenCalledWith("/runs");
  });

  it("handles purpose and case filter changes, and selecting a judge provider", async () => {
    const user = userEvent.setup();
    renderForm();

    // Change purpose to "Uji Coba"
    const trialRadio = screen.getByLabelText("Uji Coba");
    await user.click(trialRadio);
    expect(trialRadio).toBeChecked();

    // Change case filter to "Hanya Dev"
    const devFilterRadio = screen.getByLabelText("Hanya Dev");
    await user.click(devFilterRadio);
    expect(devFilterRadio).toBeChecked();

    // Change judge provider
    const judgeSelect = screen.getByLabelText(/Provider Penilai/i);
    await user.selectOptions(judgeSelect, "gemini-2.5-pro");
    expect(judgeSelect).toHaveValue("gemini-2.5-pro");
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
    const testFilterRadio = screen.getByLabelText("Hanya Test");
    await user.click(testFilterRadio);
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

  it("handles start dialog cancel, errors, and budget exceeded in dialog", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    renderForm();

    // Fill form
    await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Gemini Flash/i), "Sesi Uji");
    await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");

    // Fetch summary
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
    await screen.findByTestId("summary-card");

    // Open confirm dialog
    const startBtn = screen.getByRole("button", { name: "Mulai Pengukuran" });
    await user.click(startBtn);
    const dialog = screen.getByTestId("start-confirm-dialog");
    expect(dialog).toBeInTheDocument();

    // Click "Batal" inside confirm dialog
    const dialogCancelBtn = within(dialog).getByRole("button", { name: "Batal" });
    await user.click(dialogCancelBtn);
    expect(screen.queryByTestId("start-confirm-dialog")).not.toBeInTheDocument();

    // Re-open dialog
    await user.click(startBtn);
    const dialog2 = screen.getByTestId("start-confirm-dialog");

    // 1. Error instance when starting
    mockStartMeasurement.mockRejectedValueOnce(new Error("Gagal memulai worker"));
    const confirmBtn = within(dialog2).getByRole("button", { name: "Ya, Mulai Pengukuran" });
    await user.click(confirmBtn);
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

  it("redirects to /runs when start response session_id is empty", async () => {
    const user = userEvent.setup();
    mockGetMeasurementSummary.mockResolvedValue(MOCK_SUMMARY);
    mockStartMeasurement.mockResolvedValueOnce({
      session_id: "",
      status: "queued",
      queued_at: "2026-11-03T12:00:00Z",
    });

    renderForm();

    await user.type(screen.getByPlaceholderText(/Contoh: Evaluasi Gemini Flash/i), "Sesi Kosong");
    await user.click(screen.getByRole("checkbox", { name: "Suite Hukum Acara Pidana" }));
    const productSelect = await screen.findByRole("combobox", { name: /Pilih Produk AI/i });
    await user.selectOptions(productSelect, "prod-gemini");
    await user.click(screen.getByRole("button", { name: "Tinjau Ringkasan Biaya" }));
    await screen.findByTestId("summary-card");

    await user.click(screen.getByRole("button", { name: "Mulai Pengukuran" }));
    await user.click(screen.getByRole("button", { name: "Ya, Mulai Pengukuran" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/runs");
    });
  });

  it("clamps repeat count on blur when out of bounds", () => {
    renderForm();
    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);

    // Blur while non-empty does not change value
    fireEvent.blur(repeatInput);
    expect(repeatInput).toHaveValue(3);

    // Empty on blur resets to 3
    fireEvent.change(repeatInput, { target: { value: "" } });
    expect(repeatInput).toHaveValue(null);
    fireEvent.blur(repeatInput);
    expect(repeatInput).toHaveValue(3);

    // Multi-digit typing with last digit out of bounds (e.g. typing "9" after "3")
    fireEvent.change(repeatInput, { target: { value: "39" } });
    expect(repeatInput).toHaveValue(5);
  });
});
