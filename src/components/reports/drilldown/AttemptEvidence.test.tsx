import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { saveBlob } from "@/lib/browserDownload";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import type { EvidenceRead } from "@/types/measurement";

import { AttemptEvidence } from "./AttemptEvidence";

vi.mock("@/lib/browserDownload", () => ({ saveBlob: vi.fn() }));

function evidence(overrides: Partial<EvidenceRead> = {}): EvidenceRead {
  return {
    id: "e-1",
    kind: "file",
    file_name: "tangkapan layar.pdf",
    mime_type: "application/pdf",
    size_bytes: 1536,
    url: null,
    uploaded_by: "u-1",
    uploaded_at: "2026-11-20T03:00:00Z",
    ...overrides,
  } as EvidenceRead;
}

function renderEvidence(overrides: Partial<DrilldownGateway> = {}) {
  const gateway: DrilldownGateway = {
    cases: vi.fn(),
    caseDetail: vi.fn(),
    evidence: vi.fn().mockResolvedValue([]),
    evidenceFile: vi.fn().mockResolvedValue(new Blob(["%PDF"])),
    ...overrides,
  };
  render(<AttemptEvidence reportId="r-1" resultId="res-1" caseId="c-1" attemptNo={2} gateway={gateway} />);
  return gateway;
}

beforeEach(() => {
  vi.mocked(saveBlob).mockReset();
});

// SCRUM-328 (PBI-16 AC4, D6 step 8): manual-answer evidence opened and downloaded from the drill-down.
describe("AttemptEvidence", () => {
  it("asks for the evidence of this attempt", async () => {
    const gateway = renderEvidence();

    expect(await screen.findByText("Tidak ada bukti.")).toBeInTheDocument();
    expect(gateway.evidence).toHaveBeenCalledWith("r-1", "res-1", "c-1", 2);
  });

  // Positive: a file shows its name and size, a safe link opens in a new tab.
  it("lists files and safe links", async () => {
    renderEvidence({
      evidence: vi.fn().mockResolvedValue([
        evidence(),
        evidence({ id: "e-2", kind: "link", file_name: null, size_bytes: null, url: "https://contoh.test/bukti" }),
      ]),
    });

    expect(await screen.findByText("tangkapan layar.pdf")).toBeInTheDocument();
    expect(screen.getByText("1,5 KB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://contoh.test/bukti" })).toHaveAttribute("target", "_blank");
  });

  // Negative: an unsafe link (javascript:) is shown as text, never as a link.
  it("prints an unsafe link as text", async () => {
    renderEvidence({
      evidence: vi.fn().mockResolvedValue([evidence({ kind: "link", file_name: null, url: "javascript:alert(1)" })]),
    });

    expect(await screen.findByText("javascript:alert(1)")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("downloads a file under its own name", async () => {
    const gateway = renderEvidence({ evidence: vi.fn().mockResolvedValue([evidence()]) });

    await userEvent.click(await screen.findByRole("button", { name: "Unduh tangkapan layar.pdf" }));

    expect(gateway.evidenceFile).toHaveBeenCalledWith("r-1", "res-1", "c-1", "e-1");
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), "tangkapan layar.pdf");
  });

  // Edge: a file without a stored name falls back to "bukti", like the server.
  it("falls back to a generic name", async () => {
    renderEvidence({ evidence: vi.fn().mockResolvedValue([evidence({ file_name: null })]) });

    await userEvent.click(await screen.findByRole("button", { name: "Unduh bukti" }));

    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), "bukti");
  });

  it("explains a failed download", async () => {
    renderEvidence({
      evidence: vi.fn().mockResolvedValue([evidence()]),
      evidenceFile: vi.fn().mockRejectedValue(new ApiError(500, "ANY")),
    });

    await userEvent.click(await screen.findByRole("button", { name: "Unduh tangkapan layar.pdf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat data penelusuran. Coba lagi.");
    expect(saveBlob).not.toHaveBeenCalled();
  });

  // Negative: MANUAL_EVIDENCE_VISIBILITY=admin_only answers 403 for Kontributor; retrying cannot help.
  it("offers no retry when the evidence is closed for this role", async () => {
    renderEvidence({ evidence: vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN")) });

    expect(await screen.findByText(/tidak ditemukan atau Anda tidak punya akses/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Coba lagi" })).not.toBeInTheDocument();
  });

  it("offers a retry when the list fails", async () => {
    const list = vi.fn().mockRejectedValueOnce(new ApiError(500, "ANY")).mockResolvedValueOnce([]);
    renderEvidence({ evidence: list });

    await userEvent.click(await screen.findByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByText("Tidak ada bukti.")).toBeInTheDocument();
  });
});
