import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Suite } from "@/types/suite";
import { SuiteList } from "./SuiteList";

function makeSuite(overrides: Partial<Suite> = {}): Suite {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Perburuhan",
    description: "Kasus hukum ketenagakerjaan",
    status: "active",
    case_count: 3,
    is_empty: false,
    exportable: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("SuiteList", () => {
    it("shows a loading skeleton while fetching", () => {
    const { container } = render(
      <SuiteList
        status="loading"
        suites={[]}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Perburuhan/ })).not.toBeInTheDocument();
  });

  it("shows an error message with a retry button when the fetch failed", () => {
    const onRetry = vi.fn();

    render(
      <SuiteList
        status="error"
        suites={[]}
        onRetry={onRetry}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Gagal memuat daftar suite.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /coba lagi/i }),
    ).toBeInTheDocument();
  });

  it("shows an empty message when there are no suites", () => {
    render(
      <SuiteList
        status="ready"
        suites={[]}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getByText("Belum ada suite")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders one row per suite with its name, description and case count", () => {
    const suites = [
      makeSuite({ name: "Perburuhan", case_count: 3 }),
      makeSuite({
        id: "22222222-2222-2222-2222-222222222222",
        name: "Pertanahan",
        description: "Sengketa tanah",
        case_count: 7,
      }),
    ];

    render(
      <SuiteList
        status="ready"
        suites={suites}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 baris
    expect(screen.getByText("Perburuhan")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("marks an empty suite with a Kosong badge", () => {
    const suites = [makeSuite({ is_empty: true, case_count: 0 })];

    render(
      <SuiteList
        status="ready"
        suites={suites}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getByText("Kosong")).toBeInTheDocument();
  });

  it("leaves a suite that has cases without the badge", () => {
    const suites = [makeSuite({ is_empty: false, case_count: 3 })];

    render(
      <SuiteList
        status="ready"
        suites={suites}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.queryByText("Kosong")).not.toBeInTheDocument();
  });

  it("falls back to a dash when a suite has no description", () => {
    const suites = [makeSuite({ description: null })];

    render(
      <SuiteList
        status="ready"
        suites={suites}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("offers edit, delete and archive actions per row", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onArchive = vi.fn();
    const suite = makeSuite();

    render(
      <SuiteList
        status="ready"
        suites={[suite]}
        onRetry={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
        onArchive={onArchive}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ubah Perburuhan" }));
    expect(onEdit).toHaveBeenCalledWith(suite);

    await user.click(screen.getByRole("button", { name: "Hapus Perburuhan" }));
    expect(onDelete).toHaveBeenCalledWith(suite);

    await user.click(
      screen.getByRole("button", { name: "Arsipkan Perburuhan" }),
    );
    expect(onArchive).toHaveBeenCalledWith(suite);
  });
  
  it("offers unarchive instead of archive for an archived suite", () => {
    const suite = makeSuite({ status: "archived" });
    
    render(
    <SuiteList
        status="ready"
        suites={[suite]}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Aktifkan Perburuhan" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Arsipkan Perburuhan" }),
    ).not.toBeInTheDocument();
  });

  it("hides delete for an archived suite", () => {
    const suite = makeSuite({ status: "archived" });

    render(
      <SuiteList
        status="ready"
        suites={[suite]}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Hapus Perburuhan" }),
    ).not.toBeInTheDocument();
  });


  describe("Buat kasus link", () => {
    function renderRow(suite: Suite, canCreateCase: boolean) {
      render(
        <SuiteList
          status="ready"
          suites={[suite]}
          canCreateCase={canCreateCase}
          onRetry={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onArchive={vi.fn()}
        />,
      );
    }

    // Positive
    it("links an active suite to its new case page for someone who may write cases", () => {
      renderRow(makeSuite(), true);

      expect(
        screen.getByRole("link", { name: "Buat kasus di Perburuhan" }),
      ).toHaveAttribute("href", "/suites/11111111-1111-1111-1111-111111111111/cases/new");
    });

    // Negative
    it("hides the link from roles that may not write cases", () => {
      renderRow(makeSuite(), false);

      expect(
        screen.queryByRole("link", { name: "Buat kasus di Perburuhan" }),
      ).not.toBeInTheDocument();
    });

    it("hides the link by default so existing callers stay unchanged", () => {
      render(
        <SuiteList
          status="ready"
          suites={[makeSuite()]}
          onRetry={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onArchive={vi.fn()}
        />,
      );

      expect(screen.queryByRole("link", { name: /Buat kasus/ })).not.toBeInTheDocument();
    });

    // Corner
    it("hides the link for an archived suite, which the server would reject", () => {
      renderRow(makeSuite({ status: "archived" }), true);

      expect(
        screen.queryByRole("link", { name: "Buat kasus di Perburuhan" }),
      ).not.toBeInTheDocument();
    });

    it("encodes the suite id in the link", () => {
      renderRow(makeSuite({ id: "a/b?c" }), true);

      expect(
        screen.getByRole("link", { name: "Buat kasus di Perburuhan" }),
      ).toHaveAttribute("href", "/suites/a%2Fb%3Fc/cases/new");
    });
  });
});