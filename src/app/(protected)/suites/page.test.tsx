import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSuites } from "@/hooks/useSuites";
import SuitesPage from "./page";
import { apiFetch } from "@/lib/apiClient";

const { useSuitesMock } = vi.hoisted(() => ({ useSuitesMock: vi.fn() }));

vi.mock("@/hooks/useSuites", () => ({ useSuites: useSuitesMock }));

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

beforeEach(() => {
  useSuitesMock.mockReset();
  useSuitesMock.mockReturnValue({
    status: "ready",
    suites: [],
    reload: vi.fn(),
  });
  apiFetchMock.mockReset();
});

describe("SuitesPage", () => {
  it("asks for the active suites first", () => {
    render(<SuitesPage />);

    expect(useSuites).toHaveBeenCalledWith("active");
  });
    it("opens the create dialog from the button", async () => {
    const user = userEvent.setup();

    render(<SuitesPage />);
    await user.click(screen.getByRole("button", { name: "Buat Suite" }));

    expect(screen.getByRole("dialog", { name: "Buat suite" })).toBeInTheDocument();
  });

  it("opens the edit dialog from a row", async () => {
    const user = userEvent.setup();
    useSuitesMock.mockReturnValue({
      status: "ready",
      reload: vi.fn(),
      suites: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Perburuhan",
          description: "Kasus hukum ketenagakerjaan",
          status: "active",
          case_count: 3,
          is_empty: false,
          exportable: true,
          created_at: "2026-09-01T00:00:00Z",
          updated_at: "2026-09-01T00:00:00Z",
        },
      ],
    });

    render(<SuitesPage />);
    await user.click(screen.getByRole("button", { name: "Ubah Perburuhan" }));

    expect(screen.getByRole("dialog", { name: "Ubah suite" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nama")).toHaveValue("Perburuhan");
  });

  it("closes the dialog and reloads after saving", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    useSuitesMock.mockReturnValue({ status: "ready", suites: [], reload });
    apiFetchMock.mockResolvedValue({});

    render(<SuitesPage />);
    await user.click(screen.getByRole("button", { name: "Buat Suite" }));
    await user.type(screen.getByLabelText("Nama"), "Pertanahan");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks the Aktif tab as selected on load", () => {
    render(<SuitesPage />);

    expect(screen.getByRole("tab", { name: "Aktif" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Arsip" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches to the archived suites when the Arsip tab is clicked", async () => {
    const user = userEvent.setup();

    render(<SuitesPage />);
    await user.click(screen.getByRole("tab", { name: "Arsip" }));

    expect(useSuites).toHaveBeenLastCalledWith("archived");
    expect(screen.getByRole("tab", { name: "Arsip" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the create button", () => {
    render(<SuitesPage />);

    expect(
      screen.getByRole("button", { name: "Buat Suite" }),
    ).toBeInTheDocument();
  });

  it("shows the suites it gets from the hook", () => {
    useSuitesMock.mockReturnValue({
      status: "ready",
      reload: vi.fn(),
      suites: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Perburuhan",
          description: "Kasus hukum ketenagakerjaan",
          status: "active",
          case_count: 3,
          is_empty: false,
          exportable: true,
          created_at: "2026-09-01T00:00:00Z",
          updated_at: "2026-09-01T00:00:00Z",
        },
      ],
    });

    render(<SuitesPage />);

    expect(screen.getByText("Perburuhan")).toBeInTheDocument();
  });
    const oneSuite = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Perburuhan",
      description: "Kasus hukum ketenagakerjaan",
      status: "active",
      case_count: 3,
      is_empty: false,
      exportable: true,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
  ];

  it("opens the delete dialog from a row", async () => {
    const user = userEvent.setup();
    useSuitesMock.mockReturnValue({
      status: "ready",
      suites: oneSuite,
      reload: vi.fn(),
    });

    render(<SuitesPage />);
    await user.click(screen.getByRole("button", { name: "Hapus Perburuhan" }));

    expect(
      screen.getByRole("dialog", { name: "Hapus suite" }),
    ).toBeInTheDocument();
  });

  it("closes the delete dialog and reloads after deleting", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    useSuitesMock.mockReturnValue({
      status: "ready",
      suites: oneSuite,
      reload,
    });
    apiFetchMock.mockResolvedValue(undefined);

    render(<SuitesPage />);
    await user.click(screen.getByRole("button", { name: "Hapus Perburuhan" }));
    await user.click(screen.getByRole("button", { name: "Hapus" }));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("archives a suite from the row and reloads", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    useSuitesMock.mockReturnValue({
      status: "ready",
      suites: oneSuite,
      reload,
    });
    apiFetchMock.mockResolvedValue(oneSuite[0]);

    render(<SuitesPage />);
    await user.click(
      screen.getByRole("button", { name: "Arsipkan Perburuhan" }),
    );

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/suites/11111111-1111-1111-1111-111111111111/archive",
      { method: "POST" },
    );
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it("unarchives an archived suite from the row", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    useSuitesMock.mockReturnValue({
      status: "ready",
      suites: [{ ...oneSuite[0], status: "archived" }],
      reload,
    });
    apiFetchMock.mockResolvedValue(oneSuite[0]);

    render(<SuitesPage />);
    await user.click(
      screen.getByRole("button", { name: "Aktifkan Perburuhan" }),
    );

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/suites/11111111-1111-1111-1111-111111111111/unarchive",
      { method: "POST" },
    );
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });
    it("shows an error when archiving fails", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    useSuitesMock.mockReturnValue({
      status: "ready",
      suites: oneSuite,
      reload,
    });
    apiFetchMock.mockRejectedValue(new Error("boom"));

    render(<SuitesPage />);
    await user.click(
      screen.getByRole("button", { name: "Arsipkan Perburuhan" }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
  
});