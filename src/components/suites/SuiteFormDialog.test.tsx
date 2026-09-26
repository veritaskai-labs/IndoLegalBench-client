import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";
import { SuiteFormDialog } from "./SuiteFormDialog";

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const suite: Suite = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Perburuhan",
  description: "Kasus hukum ketenagakerjaan",
  status: "active",
  case_count: 3,
  is_empty: false,
  exportable: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("SuiteFormDialog", () => {
  it("starts empty when creating", () => {
    render(<SuiteFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText("Nama")).toHaveValue("");
    expect(screen.getByLabelText("Deskripsi")).toHaveValue("");
  });

  it("prefills the fields when editing", () => {
    render(<SuiteFormDialog suite={suite} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText("Nama")).toHaveValue("Perburuhan");
    expect(screen.getByLabelText("Deskripsi")).toHaveValue(
      "Kasus hukum ketenagakerjaan",
    );
  });

  it("posts a new suite and reports it back", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    apiFetchMock.mockResolvedValue(suite);

    render(<SuiteFormDialog onClose={vi.fn()} onSaved={onSaved} />);
    await user.type(screen.getByLabelText("Nama"), "Pertanahan");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    expect(apiFetchMock).toHaveBeenCalledWith("/suites", {
      method: "POST",
      body: JSON.stringify({ name: "Pertanahan", description: null }),
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("patches an existing suite", async () => {
    const user = userEvent.setup();
    apiFetchMock.mockResolvedValue(suite);

    render(<SuiteFormDialog suite={suite} onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.clear(screen.getByLabelText("Nama"));
    await user.type(screen.getByLabelText("Nama"), "Perburuhan II");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    expect(apiFetchMock).toHaveBeenCalledWith(`/suites/${suite.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: "Perburuhan II",
        description: "Kasus hukum ketenagakerjaan",
      }),
    });
  });

  it("shows the name error on SUITE_NAME_TAKEN without closing", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    apiFetchMock.mockRejectedValue(new ApiError(409, "SUITE_NAME_TAKEN"));

    render(<SuiteFormDialog onClose={onClose} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText("Nama"), "Perburuhan");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    expect(await screen.findByText(/nama .* sudah dipakai/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a generic error for other failures", async () => {
    const user = userEvent.setup();
    apiFetchMock.mockRejectedValue(new Error("boom"));

    render(<SuiteFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText("Nama"), "Pertanahan");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("refuses to submit an empty name", async () => {
    const user = userEvent.setup();

    render(<SuiteFormDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/nama wajib diisi/i)).toBeInTheDocument();
  });

  it("closes when cancelled", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<SuiteFormDialog onClose={onClose} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Batal" }));

    expect(onClose).toHaveBeenCalled();
  });
});