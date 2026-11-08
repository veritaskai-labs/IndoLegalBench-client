import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { saveBlob } from "@/lib/browserDownload";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { EvidenceRead } from "@/types/measurement";
import { EvidencePanel } from "./EvidencePanel";

vi.mock("@/lib/browserDownload", () => ({ saveBlob: vi.fn() }));

function link(id: string, url = "https://contoh.id/" + id): EvidenceRead {
  return { id, kind: "link", file_name: null, mime_type: null, size_bytes: null, url, uploaded_by: "u-1", uploaded_at: "2026-11-08T03:00:00Z" };
}

function file(id: string, name = "bukti.pdf"): EvidenceRead {
  return { id, kind: "file", file_name: name, mime_type: "application/pdf", size_bytes: 1536, url: null, uploaded_by: "u-1", uploaded_at: "2026-11-08T03:00:00Z" };
}

function fake(items: EvidenceRead[]) {
  return {
    listEvidence: vi.fn().mockResolvedValue(items),
    addEvidence: vi.fn().mockResolvedValue(link("baru")),
    deleteEvidence: vi.fn().mockResolvedValue(undefined),
    downloadEvidence: vi.fn().mockResolvedValue(new Blob(["x"])),
  };
}

function setup(
  gateway: ReturnType<typeof fake>,
  props: { evidenceCount?: number | null; slotFilled?: boolean; canEdit?: boolean } = {},
) {
  render(
    <EvidencePanel
      gateway={gateway as unknown as ManualAnswerGateway}
      sessionId="sesi-1"
      snapshotItemId="snap-1"
      attemptNo={1}
      evidenceCount={props.evidenceCount === undefined ? 0 : props.evidenceCount}
      slotFilled={props.slotFilled ?? true}
      canEdit={props.canEdit ?? true}
    />,
  );
}

beforeEach(() => {
  vi.mocked(saveBlob).mockReset();
});

describe("EvidencePanel visibility (AC7)", () => {
  // Negative: evidence_count null means this role may not see evidence; nothing is loaded or shown.
  it("shows nothing and loads nothing when the role may not see evidence", () => {
    // Arrange
    const gateway = fake([]);

    // Act
    setup(gateway, { evidenceCount: null });

    // Assert
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(gateway.listEvidence).not.toHaveBeenCalled();
  });

  // Edge: evidence belongs to a saved answer, so an unfilled slot only explains that.
  it("asks to save the answer first when the slot is not filled", () => {
    // Arrange
    const gateway = fake([]);

    // Act
    setup(gateway, { slotFilled: false });

    // Assert
    expect(screen.getByText("Simpan jawaban terlebih dahulu untuk menambah bukti.")).toBeInTheDocument();
    expect(gateway.listEvidence).not.toHaveBeenCalled();
  });

  it("shows nothing for an unfilled slot to someone who cannot edit", () => {
    // Arrange
    const gateway = fake([]);

    // Act
    setup(gateway, { slotFilled: false, canEdit: false });

    // Assert
    expect(screen.queryByText(/Simpan jawaban terlebih dahulu/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});

describe("EvidencePanel list", () => {
  // Positive: count out of the limit, a file with its size and a clickable link.
  it("lists files and links with the count", async () => {
    // Arrange
    const gateway = fake([file("e-1"), link("e-2")]);

    // Act
    setup(gateway, { evidenceCount: 2 });

    // Assert
    expect(await screen.findByRole("heading", { name: "Bukti (2 dari 3)" })).toBeInTheDocument();
    expect(screen.getByText("bukti.pdf")).toBeInTheDocument();
    expect(screen.getByText("1,5 KB")).toBeInTheDocument();
    const anchor = screen.getByRole("link", { name: "https://contoh.id/e-2" });
    expect(anchor).toHaveAttribute("href", "https://contoh.id/e-2");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
  });

  // Negative: an unsafe stored link is text, not a clickable link.
  it("does not make an unsafe link clickable", async () => {
    // Arrange
    const gateway = fake([link("e-1", "javascript:alert(1)")]);

    // Act
    setup(gateway, { evidenceCount: 1 });

    // Assert
    expect(await screen.findByText("javascript:alert(1)")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Edge: loading and failure states.
  it("shows a loading state first", () => {
    // Arrange
    const gateway = fake([]);
    gateway.listEvidence.mockReturnValue(new Promise(() => undefined));

    // Act
    setup(gateway);

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Memuat bukti");
  });

  it("shows the error and loads again on retry", async () => {
    // Arrange
    const gateway = fake([link("e-1")]);
    gateway.listEvidence.mockRejectedValueOnce(new ApiError(404, "MANUAL_SESSION_NOT_FOUND"));
    setup(gateway);
    await screen.findByText("Sesi pengukuran manual tidak ditemukan.");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByText("https://contoh.id/e-1")).toBeInTheDocument();
  });

  // Positive: the file is downloaded through the session, not a bare link.
  it("downloads a file", async () => {
    // Arrange
    const gateway = fake([file("e-1")]);
    setup(gateway, { evidenceCount: 1 });
    await screen.findByText("bukti.pdf");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Unduh bukti.pdf" }));

    // Assert
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), "bukti.pdf"));
    expect(gateway.downloadEvidence).toHaveBeenCalledWith("sesi-1", "e-1");
  });
});

describe("EvidencePanel add (AC7)", () => {
  // Positive: a file is sent as chosen.
  it("uploads the chosen file", async () => {
    // Arrange
    const gateway = fake([]);
    setup(gateway);
    await screen.findByRole("heading", { name: "Bukti (0 dari 3)" });
    const png = new File(["png"], "layar.png", { type: "image/png" });

    // Act
    await userEvent.upload(screen.getByLabelText("Unggah berkas bukti"), png);

    // Assert
    await waitFor(() => expect(gateway.addEvidence).toHaveBeenCalledTimes(1));
    expect(gateway.addEvidence).toHaveBeenCalledWith("sesi-1", "snap-1", 1, { kind: "file", file: png });
  });

  // Edge: the picker only offers the allowed types.
  it("offers only PNG, JPG and PDF in the file picker", async () => {
    // Arrange
    const gateway = fake([]);
    setup(gateway);

    // Act
    const input = await screen.findByLabelText("Unggah berkas bukti");

    // Assert
    expect(input).toHaveAttribute("accept", "image/png,image/jpeg,application/pdf");
  });

  // Negative: a file of the wrong type shows a message and is not sent.
  it("refuses a file of the wrong type", async () => {
    // Arrange
    const gateway = fake([]);
    setup(gateway);
    await screen.findByRole("heading", { name: "Bukti (0 dari 3)" });
    const gif = new File(["gif"], "anim.gif", { type: "image/gif" });

    // Act
    await userEvent.upload(screen.getByLabelText("Unggah berkas bukti"), gif, { applyAccept: false });

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Hanya berkas PNG, JPG, atau PDF yang boleh diunggah.");
    expect(gateway.addEvidence).not.toHaveBeenCalled();
  });

  // Positive: a link is sent and the field is cleared.
  it("adds a link and clears the field", async () => {
    // Arrange
    const gateway = fake([]);
    setup(gateway);
    await screen.findByRole("heading", { name: "Bukti (0 dari 3)" });
    const field = screen.getByLabelText("Tautan bukti");

    // Act
    await userEvent.type(field, "https://justisio.com/chat/1");
    await userEvent.click(screen.getByRole("button", { name: "Tambah tautan" }));

    // Assert
    await waitFor(() => expect(gateway.addEvidence).toHaveBeenCalledWith("sesi-1", "snap-1", 1, { kind: "link", url: "https://justisio.com/chat/1" }));
    await waitFor(() => expect(field).toHaveValue(""));
  });

  // Negative: an empty or unsafe link shows a message and keeps what was typed.
  it("refuses an unsafe link and keeps the text", async () => {
    // Arrange
    const gateway = fake([]);
    setup(gateway);
    await screen.findByRole("heading", { name: "Bukti (0 dari 3)" });
    const field = screen.getByLabelText("Tautan bukti");

    // Act
    await userEvent.type(field, "javascript:alert(1)");
    await userEvent.click(screen.getByRole("button", { name: "Tambah tautan" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Tautan bukti harus diawali http:// atau https://.");
    expect(field).toHaveValue("javascript:alert(1)");
    expect(gateway.addEvidence).not.toHaveBeenCalled();
  });

  // Negative: at the limit the controls are off and the reason is shown.
  it("turns the add controls off at 3 items", async () => {
    // Arrange
    const gateway = fake([link("e-1"), link("e-2"), link("e-3")]);

    // Act
    setup(gateway, { evidenceCount: 3 });

    // Assert
    expect(await screen.findByText(/sudah mencapai batas 3 per jawaban/)).toBeInTheDocument();
    expect(screen.getByLabelText("Unggah berkas bukti")).toBeDisabled();
    expect(screen.getByLabelText("Tautan bukti")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tambah tautan" })).toBeDisabled();
  });
});

describe("EvidencePanel delete and read-only", () => {
  // Edge: cancelling the file picker (no file chosen) sends nothing.
  it("sends nothing when no file is chosen", async () => {
    // Arrange
    const gateway = fake([]);
    setup(gateway);
    await screen.findByRole("heading", { name: "Bukti (0 dari 3)" });

    // Act
    fireEvent.change(screen.getByLabelText("Unggah berkas bukti"), { target: { files: [] } });

    // Assert
    expect(gateway.addEvidence).not.toHaveBeenCalled();
  });

  // Positive: delete needs a confirmation because the file is removed for good.
  it("deletes an item after the user confirms", async () => {
    // Arrange
    const gateway = fake([link("e-1")]);
    setup(gateway, { evidenceCount: 1 });
    await screen.findByText("https://contoh.id/e-1");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Hapus bukti 1" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Hapus bukti" }));

    // Assert
    await waitFor(() => expect(gateway.deleteEvidence).toHaveBeenCalledWith("sesi-1", "e-1"));
  });

  // Negative: cancelling keeps the item.
  it("keeps the item when the user cancels", async () => {
    // Arrange
    const gateway = fake([link("e-1")]);
    setup(gateway, { evidenceCount: 1 });
    await screen.findByText("https://contoh.id/e-1");
    await userEvent.click(screen.getByRole("button", { name: "Hapus bukti 1" }));

    // Act
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));

    // Assert
    expect(gateway.deleteEvidence).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Negative: someone who cannot edit sees the evidence but cannot add or delete.
  it("has no add or delete controls without edit permission", async () => {
    // Arrange
    const gateway = fake([file("e-1")]);

    // Act
    setup(gateway, { evidenceCount: 1, canEdit: false });

    // Assert
    expect(await screen.findByText("bukti.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unduh bukti.pdf" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Unggah berkas bukti")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hapus bukti/ })).not.toBeInTheDocument();
  });

  // Negative: a failed delete closes the dialog, shows the message and keeps the item.
  it("shows the error and keeps the item when the delete fails", async () => {
    // Arrange
    const gateway = fake([link("e-1")]);
    gateway.deleteEvidence.mockRejectedValue(new ApiError(404, "EVIDENCE_NOT_FOUND"));
    setup(gateway, { evidenceCount: 1 });
    await screen.findByText("https://contoh.id/e-1");
    await userEvent.click(screen.getByRole("button", { name: "Hapus bukti 1" }));

    // Act
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Hapus bukti" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Bukti tidak ditemukan. Mungkin sudah dihapus.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("https://contoh.id/e-1")).toBeInTheDocument();
  });
});
