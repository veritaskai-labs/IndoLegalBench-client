import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaseCard } from "./CaseCard";
import { MetricCard } from "./MetricCard";
import { ProviderCard } from "./ProviderCard";

describe("Design System Cards", () => {
  describe("CaseCard", () => {
    it("merender informasi kartu kasus hukum secara lengkap", () => {
      const handleOpen = vi.fn();
      render(
        <CaseCard
          id="ILB-PT-0142"
          title="Kewajiban notifikasi PHK pada perusahaan dengan 50 pekerja"
          status="In review"
          axis="akurasi pasal"
          tag="dev"
          version="v3"
          author="Rina Hapsari"
          updatedAt="2 hari lalu"
          onOpen={handleOpen}
        />
      );

      // Verifikasi ID, Judul, dan Metadata
      expect(screen.getByText("ILB-PT-0142")).toBeInTheDocument();
      expect(
        screen.getByText("Kewajiban notifikasi PHK pada perusahaan dengan 50 pekerja")
      ).toBeInTheDocument();
      expect(screen.getByText("In review")).toBeInTheDocument();
      expect(screen.getByText("akurasi pasal")).toBeInTheDocument();
      expect(screen.getByText("dev")).toBeInTheDocument();
      expect(screen.getByText("v3")).toBeInTheDocument();
      expect(screen.getByText("Rina Hapsari · 2 hari lalu")).toBeInTheDocument();

      // Trigger tombol aksi buka
      const openBtn = screen.getByRole("button", { name: "Buka" });
      fireEvent.click(openBtn);
      expect(handleOpen).toHaveBeenCalledTimes(1);
    });

    it("menerapkan badge status yang sesuai untuk status selain In review", () => {
      const { rerender } = render(
        <CaseCard
          id="ILB-01"
          title="Kasus Approved"
          status="Approved"
          axis="akurasi regulasi"
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
          title="Kasus Revisi"
          status="Needs revision"
          axis="akurasi regulasi"
          tag="test"
          version="v1"
          author="Budi"
          updatedAt="Hari ini"
        />
      );
      expect(screen.getByText("Needs revision")).toHaveClass("text-rose-800");

      rerender(
        <CaseCard
          id="ILB-03"
          title="Kasus Draft"
          status="Draft"
          axis="akurasi regulasi"
          tag="dev"
          version="v1"
          author="Budi"
          updatedAt="Hari ini"
        />
      );
      expect(screen.getByText("Draft")).toHaveClass("text-slate-700");
    });
  });

  describe("MetricCard", () => {
    it("merender nilai persentase, label, delta, dan info sampel", () => {
      render(
        <MetricCard
          label="Pass rate · AiYU AI Agent"
          value="78,4%"
          delta="+4,1 pt"
          sampleInfo="N=3 · suite v4 · test set (120 kasus)"
          note="error rate 2,1% dilaporkan terpisah"
        />
      );

      expect(screen.getByText("Pass rate · AiYU AI Agent")).toBeInTheDocument();
      expect(screen.getByText("78,4%")).toBeInTheDocument();
      expect(screen.getByText("+4,1 pt")).toBeInTheDocument();
      expect(screen.getByText("N=3 · suite v4 · test set (120 kasus)")).toBeInTheDocument();
      expect(screen.getByText("error rate 2,1% dilaporkan terpisah")).toBeInTheDocument();
    });

    it("menghitung lebar progress bar otomatis dari string value jika progressPercent tidak diberikan", () => {
      const { container } = render(
        <MetricCard label="Pass rate" value="78,4%" />
      );
      const progressBar = container.querySelector(".bg-teal-700");
      expect(progressBar).toHaveStyle({ width: "78.4%" });
    });

    it("memprioritaskan prop progressPercent eksplisit dibanding nilai string", () => {
      const { container } = render(
        <MetricCard label="Pass rate" value="78,4%" progressPercent={50} />
      );
      const progressBar = container.querySelector(".bg-teal-700");
      expect(progressBar).toHaveStyle({ width: "50%" });
    });
  });

  describe("ProviderCard", () => {
    it("merender identitas provider, rpm, versi, dan badge kepatuhan", () => {
      render(
        <ProviderCard
          name="Provider AI hukum"
          rpm={60}
          version="v2026.08"
          tosReviewed={true}
          keyEncrypted={true}
        />
      );

      expect(screen.getByText("Provider AI hukum")).toBeInTheDocument();
      expect(screen.getByText("60 rpm · v2026.08")).toBeInTheDocument();
      expect(screen.getByText("ToS reviewed")).toBeInTheDocument();
      expect(screen.getByText("key encrypted")).toBeInTheDocument();
    });

    it("dapat menyembunyikan badge ToS dan enkripsi jika disetel false", () => {
      render(
        <ProviderCard
          name="Provider Eksperimental"
          rpm={30}
          version="v1"
          tosReviewed={false}
          keyEncrypted={false}
        />
      );

      expect(screen.getByText("Provider Eksperimental")).toBeInTheDocument();
      expect(screen.queryByText("ToS reviewed")).not.toBeInTheDocument();
      expect(screen.queryByText("key encrypted")).not.toBeInTheDocument();
    });
  });
});