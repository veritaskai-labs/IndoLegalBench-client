import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";
import { DeleteSuiteDialog } from "./DeleteSuiteDialog";

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

describe("DeleteSuiteDialog", () => {
  it("asks for confirmation and names the suite", () => {
    render(<DeleteSuiteDialog suite={suite} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Hapus suite" })).toBeInTheDocument();
    expect(screen.getByText(/Perburuhan/)).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("deletes the suite when confirmed", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    apiFetchMock.mockResolvedValue(undefined);

    render(<DeleteSuiteDialog suite={suite} onClose={vi.fn()} onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Hapus" }));

    expect(apiFetchMock).toHaveBeenCalledWith(`/suites/${suite.id}`, {
      method: "DELETE",
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("offers to archive instead when the suite has approved cases", async () => {
    const user = userEvent.setup();
    apiFetchMock.mockRejectedValue(new ApiError(409, "SUITE_HAS_APPROVED_CASES"));

    render(<DeleteSuiteDialog suite={suite} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hapus" }));

    expect(
      await screen.findByRole("button", { name: "Arsipkan saja" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/kasus yang sudah disetujui/i)).toBeInTheDocument();
  });

  it("archives the suite from the fallback button", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(409, "SUITE_HAS_APPROVED_CASES"),
    );

    render(<DeleteSuiteDialog suite={suite} onClose={vi.fn()} onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Hapus" }));

    apiFetchMock.mockResolvedValueOnce(suite);
    await user.click(screen.getByRole("button", { name: "Arsipkan saja" }));

    expect(apiFetchMock).toHaveBeenLastCalledWith(
      `/suites/${suite.id}/archive`,
      { method: "POST" },
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("shows a generic error for other failures", async () => {
    const user = userEvent.setup();
    apiFetchMock.mockRejectedValue(new Error("boom"));

    render(<DeleteSuiteDialog suite={suite} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hapus" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Arsipkan saja" }),
    ).not.toBeInTheDocument();
  });

  it("closes when cancelled", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<DeleteSuiteDialog suite={suite} onClose={onClose} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Batal" }));

    expect(onClose).toHaveBeenCalled();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});