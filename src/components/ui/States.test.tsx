import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetMockLocale, setMockLocale } from "@/lib/i18n/localeMock";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

afterEach(() => {
  resetMockLocale();
});

describe("Reusable States UI Components", () => {
  describe("LoadingSkeleton", () => {
    it("merender varian 'lines' default sesuai prop rows", () => {
      const { container } = render(<LoadingSkeleton variant="lines" rows={4} />);
      // Menguji jumlah placeholder pulse
      const pulses = container.querySelectorAll(".animate-pulse");
      expect(pulses).toHaveLength(4);
    });

    it("merender varian 'table' dengan jumlah baris dan kolom yang tepat", () => {
      render(
        <table>
          <tbody>
            <LoadingSkeleton variant="table" rows={3} columns={4} />
          </tbody>
        </table>
      );

      const tableRows = screen.getAllByRole("row");
      expect(tableRows).toHaveLength(3);
      tableRows.forEach((row) => {
        expect(row).toHaveAttribute("aria-busy", "true");
      });

      const cells = screen.getAllByRole("cell");
      expect(cells).toHaveLength(12);

      const statusAnnouncements = screen.getAllByRole("status");
      expect(statusAnnouncements).toHaveLength(3);
      expect(statusAnnouncements[0]).toHaveTextContent("Memuat data tabel…");
    });

    it("announces the table in English when the language mock is English", () => {
      setMockLocale("en");
      render(
        <table>
          <tbody>
            <LoadingSkeleton variant="table" rows={1} columns={1} />
          </tbody>
        </table>,
      );

      expect(screen.getByRole("status")).toHaveTextContent("Loading table data…");
    });

    it("merender varian 'cards' untuk tipe case, metric, dan provider", () => {
      const { rerender } = render(
        <LoadingSkeleton variant="cards" cardType="case" rows={2} />
      );
      let cards = screen.getAllByTestId("card-skeleton");
      expect(cards).toHaveLength(2);

      rerender(<LoadingSkeleton variant="cards" cardType="metric" rows={3} />);
      cards = screen.getAllByTestId("card-skeleton");
      expect(cards).toHaveLength(3);

      rerender(<LoadingSkeleton variant="cards" cardType="provider" rows={1} />);
      cards = screen.getAllByTestId("card-skeleton");
      expect(cards).toHaveLength(1);

      rerender(<LoadingSkeleton variant="cards" cardType="generic" rows={2} />);
      cards = screen.getAllByTestId("card-skeleton");
      expect(cards).toHaveLength(2);
    });
  });

  describe("EmptyState", () => {
    it("merender teks default saat tidak diberikan props khusus", () => {
      render(<EmptyState />);
      expect(screen.getByText("Tidak ada data ditemukan")).toBeInTheDocument();
      expect(
        screen.getByText("Belum ada item yang terdaftar atau sesuai kriteria pencarian.")
      ).toBeInTheDocument();
    });

    it("merender judul dan deskripsi kustom", () => {
      render(
        <EmptyState
          title="Tidak ada suite"
          description="Silakan buat suite baru untuk memulai."
        />
      );
      expect(screen.getByText("Tidak ada suite")).toBeInTheDocument();
      expect(screen.getByText("Silakan buat suite baru untuk memulai.")).toBeInTheDocument();
    });

    it("menampilkan tombol aksi dan memicu callback onClick saat diklik", () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          action={{
            label: "Buat Suite Baru",
            onClick: handleAction,
          }}
        />
      );

      const actionButton = screen.getByRole("button", { name: "Buat Suite Baru" });
      expect(actionButton).toBeInTheDocument();

      fireEvent.click(actionButton);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it("uses the English empty copy when that language is on screen", () => {
      render(
        <LocaleProvider locale="en">
          <EmptyState />
        </LocaleProvider>,
      );
      expect(screen.getByText("No data found")).toBeInTheDocument();
      expect(screen.getByText("Nothing is listed yet, or nothing matches the search.")).toBeInTheDocument();
    });

    it("merender di dalam baris tabel saat prop inTable={true}", () => {
      render(
        <table>
          <tbody>
            <EmptyState inTable={true} colSpan={6} title="Tabel Kosong" />
          </tbody>
        </table>
      );

      const cell = screen.getByRole("cell");
      expect(cell).toHaveAttribute("colSpan", "6");
      expect(screen.getByText("Tabel Kosong")).toBeInTheDocument();
    });
  });

  describe("ErrorState", () => {
    it("merender varian banner default dengan pesan bawaan", () => {
      render(<ErrorState />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Terjadi kesalahan saat memuat data.")).toBeInTheDocument();
    });

    it("merender varian card dengan pesan kustom dan tombol coba lagi", () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          variant="card"
          message="Koneksi server terputus."
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText("Gagal Memuat Data")).toBeInTheDocument();
      expect(screen.getByText("Koneksi server terputus.")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: "Coba lagi" });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it("tidak merender tombol coba lagi jika onRetry tidak disediakan", () => {
      render(<ErrorState message="Galat tanpa retry" />);
      expect(screen.queryByRole("button", { name: "Coba lagi" })).not.toBeInTheDocument();
    });

    it("names the card and the retry button in English", () => {
      render(
        <LocaleProvider locale="en">
          <ErrorState variant="card" onRetry={() => {}} />
        </LocaleProvider>,
      );
      expect(screen.getByText("Could not load data")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong while loading the data.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });
  });

  describe("LoadingState", () => {
    it("says Memuat until a caller passes its own label", () => {
      render(<LoadingState />);
      expect(screen.getByRole("status")).toHaveTextContent("Memuat…");
    });

    it("says Loading in English", () => {
      render(
        <LocaleProvider locale="en">
          <LoadingState />
        </LocaleProvider>,
      );
      expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    });
  });
});
