import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

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

      // Total 3 baris x 4 kolom = 12 cell <td>
      const cells = screen.getAllByRole("cell");
      expect(cells).toHaveLength(12);
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
  });
});