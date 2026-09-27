import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaseCard } from "./CaseCard";
import { MetricCard } from "./MetricCard";
import { ProviderCard } from "./ProviderCard";

describe("Design System Cards", () => {
  describe("CaseCard", () => {
    it("merender informasi kartu kasus dengan status API enum dan event onOpen", () => {
      const handleOpen = vi.fn();
      render(
        <CaseCard
          id="ILB-PT-0142"
          title="Kewajiban notifikasi PHK pada perusahaan dengan 50 pekerja"
          status="in_review"
          axis="akurasi pasal"
          tag="dev"
          version="v3"
          author="Rina Hapsari"
          updatedAt="2 hari lalu"
          onOpen={handleOpen}
        />
      );

      expect(screen.getByText("ILB-PT-0142")).toBeInTheDocument();
      expect(screen.getByText("In review")).toBeInTheDocument();

      const openBtn = screen.getByRole("button", { name: "Buka" });
      fireEvent.click(openBtn);
      expect(handleOpen).toHaveBeenCalledTimes(1);
    });

    it("menerapkan badge status yang sesuai untuk status approved dan needs_revision", () => {
      const { rerender } = render(
        <CaseCard
          id="ILB-01"
          title="Kasus 1"
          status="approved"
          axis="akurasi"
          tag="test"
          version="v1"
          author="Budi"
          updatedAt="Hari ini"
        />
      );
      expect(screen.getByText("Approved")).toHaveClass("text-emerald-800");

      rerender(
        <CaseCard
          id="ILB-02"
          title="Kasus 2"
          status="needs_revision"
          axis="akurasi"
          tag="test"
          version="v1"
          author="Budi"
          updatedAt="Hari ini"
        />
      );
      expect(screen.getByText("Needs revision")).toHaveClass("text-rose-800");
    });
  });

  describe("MetricCard", () => {
    it("merender nilai persentase, label, dan warna delta dinamis", () => {
      const { rerender } = render(
        <MetricCard
          label="Pass rate"
          value="65%"
          delta="+4,1 pt"
        />
      );

      expect(screen.getByText("65%")).toBeInTheDocument();
      expect(screen.getByText("+4,1 pt")).toHaveClass("text-emerald-700");

      rerender(
        <MetricCard
          label="Failure rate"
          value="35%"
          delta="-2,5 pt"
        />
      );
      expect(screen.getByText("-2,5 pt")).toHaveClass("text-rose-700");
    });

    it("menghitung lebar progress bar otomatis dari value (misal: 62%)", () => {
      render(<MetricCard label="Pass rate" value="62%" />);
      const progressBar = screen.getByTestId("metric-progress-bar");
      expect(progressBar).toHaveStyle({ width: "62%" });
    });

    it("menghitung lebar progress bar dari format rasio (misal: '1/4 kasus' menjadi 25%)", () => {
      render(<MetricCard label="Terselesaikan" value="1/4 kasus" />);
      const progressBar = screen.getByTestId("metric-progress-bar");
      expect(progressBar).toHaveStyle({ width: "25%" });
    });

    it("menghitung lebar progress bar dari rasio dengan spasi (misal: '3 / 5' menjadi 60%)", () => {
      render(<MetricCard label="Skor" value="3 / 5 kasus" />);
      const progressBar = screen.getByTestId("metric-progress-bar");
      expect(progressBar).toHaveStyle({ width: "60%" });
    });

    it("memprioritaskan prop progressPercent eksplisit dibanding nilai string", () => {
      render(
        <MetricCard label="Pass rate" value="80%" progressPercent={25} />
      );
      const progressBar = screen.getByTestId("metric-progress-bar");
      expect(progressBar).toHaveStyle({ width: "25%" });
    });

    it("tidak merender progress bar jika value bukan persentase dan progressPercent undefined", () => {
      render(<MetricCard label="Total Kasus" value="120 kasus" />);
      expect(screen.queryByTestId("metric-progress-bar")).not.toBeInTheDocument();
    });
  });

  describe("ProviderCard", () => {
    it("default fail-closed: menyembunyikan badge jika prop tidak diisi", () => {
      render(
        <ProviderCard
          name="Provider AI hukum"
          rpm={60}
          version="v2026.08"
        />
      );

      expect(screen.getByText("Provider AI hukum")).toBeInTheDocument();
      expect(screen.queryByText("ToS reviewed")).not.toBeInTheDocument();
      expect(screen.queryByText("key encrypted")).not.toBeInTheDocument();
    });

    it("merender badge jika flags bernilai true", () => {
      render(
        <ProviderCard
          name="Provider AI hukum"
          rpm={60}
          version="v2026.08"
          tosReviewed={true}
          keyEncrypted={true}
        />
      );

      expect(screen.getByText("ToS reviewed")).toBeInTheDocument();
      expect(screen.getByText("key encrypted")).toBeInTheDocument();
    });
  });
});
