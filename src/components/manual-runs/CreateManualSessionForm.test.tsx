import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateManualSessionForm } from "./CreateManualSessionForm";
import type { Suite } from "@/types/suite";
import { ToastProvider } from "@/components/ui/Toast";

const { pushMock, showToastMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/ui/Toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/Toast")>();
  return {
    ...actual,
    useToast: () => ({ showToast: showToastMock }),
  };
});

const { useSuitesMock } = vi.hoisted(() => ({
  useSuitesMock: vi.fn(),
}));

vi.mock("@/hooks/useSuites", () => ({
  useSuites: useSuitesMock,
}));

vi.mock("@/components/providers/ProductSelect", () => ({
  ProductSelect: ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (id: string) => void;
    label?: string;
  }) => (
    <div>
      <label htmlFor="product-select">{label}</label>
      <select
        id="product-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="product-select"
      >
        <option value="">Pilih Produk AI Manual</option>
        <option value="prod-manual-1">LegalHero</option>
        <option value="prod-manual-2">Justisio</option>
      </select>
    </div>
  ),
}));

vi.mock("@/lib/runs/manualRunsApi", () => ({
  createManualSession: vi.fn(),
  manualErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

import { createManualSession } from "@/lib/runs/manualRunsApi";

const mockCreateManualSession = vi.mocked(createManualSession);

const MOCK_SUITES: Suite[] = [
  {
    id: "suite-1",
    name: "Suite Hukum Pidana",
    description: null,
    status: "active",
    case_count: 50,
    is_empty: false,
    exportable: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "suite-2",
    name: "Suite Hukum Perdata",
    description: null,
    status: "active",
    case_count: 50,
    is_empty: false,
    exportable: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function renderForm() {
  return render(
    <ToastProvider>
      <CreateManualSessionForm />
    </ToastProvider>,
  );
}

describe("CreateManualSessionForm (PBI-22 AC1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSuitesMock.mockReturnValue({
      status: "ready",
      suites: MOCK_SUITES,
      reload: vi.fn(),
    });
  });

  it("renders all form sections and disabled submit button initially", () => {
    renderForm();

    expect(screen.getByText("1. Informasi Sesi")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama \/ Label Sesi/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pengukuran Resmi" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Uji Coba" })).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(/Pilih tujuan sesi untuk mengaktifkan tombol buat sesi/),
    ).toBeInTheDocument();

    expect(screen.getByText(/2. Pilih Suite Kasus & Filter/)).toBeInTheDocument();
    expect(screen.getByText("Suite Hukum Pidana")).toBeInTheDocument();
    expect(screen.getByText("Suite Hukum Perdata")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semua (Dev & Test)" })).toHaveAttribute("aria-pressed", "true");

    // Filter buttons from left to right: Semua (Dev & Test), Hanya Dev, Hanya Test
    const filterBtns = screen
      .getAllByRole("button")
      .filter((b) => ["Semua (Dev & Test)", "Hanya Dev", "Hanya Test"].includes(b.textContent || ""));
    expect(filterBtns.map((b) => b.textContent)).toEqual([
      "Semua (Dev & Test)",
      "Hanya Dev",
      "Hanya Test",
    ]);

    expect(screen.getByText(/3. Produk AI Manual/)).toBeInTheDocument();
    expect(screen.getByTestId("product-select")).toBeInTheDocument();

    expect(screen.getByText("4. Jumlah Percobaan per Kasus")).toBeInTheDocument();
    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    expect(repeatInput).toHaveValue(1);

    const submitBtn = screen.getByRole("button", { name: "Buat Sesi Pengukuran" });
    expect(submitBtn).toBeDisabled();
  });

  it("handles suite selection: toggle, select all, and clear", async () => {
    const user = userEvent.setup();
    renderForm();

    const suite1Check = screen.getByLabelText("Suite Hukum Pidana");
    const suite2Check = screen.getByLabelText("Suite Hukum Perdata");

    expect(suite1Check).not.toBeChecked();
    expect(suite2Check).not.toBeChecked();

    // Toggle single
    await user.click(suite1Check);
    expect(suite1Check).toBeChecked();

    // Untoggle single
    await user.click(suite1Check);
    expect(suite1Check).not.toBeChecked();

    // Select all
    const selectAllBtn = screen.getByText("Pilih Semua");
    await user.click(selectAllBtn);
    expect(suite1Check).toBeChecked();
    expect(suite2Check).toBeChecked();

    // Clear all
    const clearBtn = screen.getByText("Kosongkan");
    await user.click(clearBtn);
    expect(suite1Check).not.toBeChecked();
    expect(suite2Check).not.toBeChecked();
  });

  it("handles repeat count typing, clamping (1-5), and blur fallback like automatic runs", async () => {
    const user = userEvent.setup();
    renderForm();

    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    expect(repeatInput).toHaveValue(1);

    // Fill valid base fields
    await user.type(screen.getByLabelText(/Nama \/ Label Sesi/), "Sesi LegalHero");
    await user.click(screen.getByRole("button", { name: "Uji Coba" }));
    await user.click(screen.getByLabelText("Suite Hukum Pidana"));
    await user.selectOptions(screen.getByTestId("product-select"), "prod-manual-1");

    const submitBtn = screen.getByRole("button", { name: "Buat Sesi Pengukuran" });
    expect(submitBtn).toBeEnabled();

    // Typing empty disables submit
    await user.clear(repeatInput);
    expect(repeatInput).toHaveValue(null);
    expect(submitBtn).toBeDisabled();

    // Blur restores default 1 and re-enables submit
    await user.tab();
    expect(repeatInput).toHaveValue(1);
    expect(submitBtn).toBeEnabled();

    // Typing values: 4 sets 4
    await user.clear(repeatInput);
    await user.type(repeatInput, "4");
    expect(repeatInput).toHaveValue(4);
    expect(submitBtn).toBeEnabled();

    // Typing > 5 clamps to 5
    await user.clear(repeatInput);
    await user.type(repeatInput, "9");
    expect(repeatInput).toHaveValue(5);
    expect(submitBtn).toBeEnabled();

    // Typing 0 clamps to 1
    await user.clear(repeatInput);
    await user.type(repeatInput, "0");
    expect(repeatInput).toHaveValue(1);
    expect(submitBtn).toBeEnabled();
  });

  it("navigates back to /manual-runs when clicking Batal", async () => {
    const user = userEvent.setup();
    renderForm();

    const cancelBtn = screen.getByRole("button", { name: "Batal" });
    await user.click(cancelBtn);

    expect(pushMock).toHaveBeenCalledWith("/manual-runs");
  });

  it("submits the form successfully and redirects to detail page", async () => {
    const user = userEvent.setup();
    mockCreateManualSession.mockResolvedValueOnce({
      session_id: "session-new-123",
      status: "not_filled",
      case_count: 50,
      repetitions: 2,
      total_answers: 50,
    });

    renderForm();

    await user.type(screen.getByLabelText(/Nama \/ Label Sesi/), "Pengukuran Batch 1 LegalHero");
    await user.click(screen.getByRole("button", { name: "Pengukuran Resmi" }));
    await user.click(screen.getByLabelText("Suite Hukum Pidana"));
    await user.click(screen.getByRole("button", { name: "Hanya Dev" }));
    await user.selectOptions(screen.getByTestId("product-select"), "prod-manual-1");

    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    await user.clear(repeatInput);
    await user.type(repeatInput, "2");

    const submitBtn = screen.getByRole("button", { name: "Buat Sesi Pengukuran" });
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    expect(mockCreateManualSession).toHaveBeenCalledWith({
      label: "Pengukuran Batch 1 LegalHero",
      purpose: "official",
      suite_ids: ["suite-1"],
      case_filter: "dev",
      product_id: "prod-manual-1",
      repeat_count: 2,
      judge_provider_id: null,
    });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Sesi pengukuran manual “Pengukuran Batch 1 LegalHero” berhasil dibuat',
      );
      expect(pushMock).toHaveBeenCalledWith("/manual-runs/session-new-123");
    });
  });

  it("displays error message if session creation fails", async () => {
    const user = userEvent.setup();
    mockCreateManualSession.mockRejectedValueOnce(
      new Error("Produk AI manual tidak ditemukan."),
    );

    renderForm();

    await user.type(screen.getByLabelText(/Nama \/ Label Sesi/), "Pengukuran Gagal");
    await user.click(screen.getByRole("button", { name: "Uji Coba" }));
    await user.click(screen.getByLabelText("Suite Hukum Pidana"));
    await user.selectOptions(screen.getByTestId("product-select"), "prod-manual-1");

    const submitBtn = screen.getByRole("button", { name: "Buat Sesi Pengukuran" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Produk AI manual tidak ditemukan.");
    });
    expect(submitBtn).toBeEnabled();
  });

  it("extracts last digit when typing multiple characters into repeat count (AC1)", async () => {
    const user = userEvent.setup();
    renderForm();

    const repeatInput = screen.getByLabelText(/Jumlah Pengulangan/i);
    // User types "12" directly into the box with existing 1 -> extracts 2
    await user.type(repeatInput, "2");
    expect(repeatInput).toHaveValue(2);

    // User types "9" -> "29", last digit 9 is > 5 so stays 29 then clamped to 5
    await user.type(repeatInput, "9");
    expect(repeatInput).toHaveValue(5);

    // User types "0" -> "50", last digit 0 is < 1 so stays 50 then clamped to 5
    await user.type(repeatInput, "0");
    expect(repeatInput).toHaveValue(5);
  });

  it("renders loading, error, and empty states for suites list", () => {
    // Loading state
    useSuitesMock.mockReturnValueOnce({
      status: "loading",
      suites: [],
      reload: vi.fn(),
    });
    const { unmount: unmountLoading } = renderForm();
    expect(screen.getByText("Memuat suite kasus…")).toBeInTheDocument();
    unmountLoading();

    // Error state
    useSuitesMock.mockReturnValueOnce({
      status: "error",
      suites: [],
      reload: vi.fn(),
    });
    const { unmount: unmountError } = renderForm();
    expect(screen.getByText("Gagal memuat daftar suite.")).toBeInTheDocument();
    unmountError();

    // Empty state
    useSuitesMock.mockReturnValueOnce({
      status: "ready",
      suites: [],
      reload: vi.fn(),
    });
    const { unmount: unmountEmpty } = renderForm();
    expect(screen.getByText("Belum ada suite aktif yang tersedia.")).toBeInTheDocument();
    unmountEmpty();
  });

  it("prevents form submission when required fields are missing", () => {
    renderForm();

    const form = screen.getByRole("button", { name: "Buat Sesi Pengukuran" }).closest("form");
    expect(form).not.toBeNull();

    if (form) {
      fireEvent.submit(form);
    }

    expect(mockCreateManualSession).not.toHaveBeenCalled();
  });
});
