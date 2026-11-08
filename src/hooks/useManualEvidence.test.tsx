import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { saveBlob } from "@/lib/browserDownload";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { EvidenceRead } from "@/types/measurement";
import { useManualEvidence } from "./useManualEvidence";

vi.mock("@/lib/browserDownload", () => ({ saveBlob: vi.fn() }));

function item(id: string, overrides: Partial<EvidenceRead> = {}): EvidenceRead {
  return {
    id,
    kind: "link",
    file_name: null,
    mime_type: null,
    size_bytes: null,
    url: "https://contoh.id/" + id,
    uploaded_by: "u-1",
    uploaded_at: "2026-11-08T03:00:00Z",
    ...overrides,
  };
}

const LINK = { kind: "link", url: "https://contoh.id/baru" } as const;

type Fake = {
  listEvidence: ReturnType<typeof vi.fn>;
  addEvidence: ReturnType<typeof vi.fn>;
  deleteEvidence: ReturnType<typeof vi.fn>;
  downloadEvidence: ReturnType<typeof vi.fn>;
};

function fake(initial: EvidenceRead[]): Fake {
  return {
    listEvidence: vi.fn().mockResolvedValue(initial),
    addEvidence: vi.fn().mockResolvedValue(item("baru")),
    deleteEvidence: vi.fn().mockResolvedValue(undefined),
    downloadEvidence: vi.fn().mockResolvedValue(new Blob(["x"])),
  };
}

async function setup(gateway: Fake) {
  const view = renderHook(() => useManualEvidence(gateway as unknown as ManualAnswerGateway, "sesi-1", "snap-1", 2));
  await waitFor(() => expect(view.result.current.list.status).not.toBe("loading"));
  return view;
}

beforeEach(() => {
  vi.mocked(saveBlob).mockReset();
});

describe("loading the evidence of an answer (AC7)", () => {
  // Positive.
  it("lists the evidence of the right slot", async () => {
    // Arrange
    const gateway = fake([item("e-1")]);

    // Act
    const { result } = await setup(gateway);

    // Assert
    expect(gateway.listEvidence).toHaveBeenCalledWith("sesi-1", "snap-1", 2);
    expect(result.current.list).toMatchObject({ status: "ready", data: [item("e-1")] });
  });

  // Negative: a failure to load is a message, not a crash.
  it("shows the message of a failed load", async () => {
    // Arrange
    const gateway = fake([]);
    gateway.listEvidence.mockRejectedValue(new ApiError(404, "MANUAL_SESSION_NOT_FOUND"));

    // Act
    const { result } = await setup(gateway);

    // Assert
    expect(result.current.list).toMatchObject({ status: "error", message: "Sesi pengukuran manual tidak ditemukan." });
  });

  it("uses the evidence fallback for an unknown load failure", async () => {
    // Arrange
    const gateway = fake([]);
    gateway.listEvidence.mockRejectedValue(new TypeError("Failed to fetch"));

    // Act
    const { result } = await setup(gateway);

    // Assert
    expect(result.current.list).toMatchObject({ status: "error", message: "Terjadi kesalahan pada bukti jawaban. Coba lagi." });
  });
});

describe("add (AC7)", () => {
  // Positive: sent to the server, then the list is loaded again.
  it("uploads and loads the list again", async () => {
    // Arrange
    const gateway = fake([item("e-1")]);
    const { result } = await setup(gateway);

    // Act
    await act(async () => result.current.add(LINK));

    // Assert
    expect(gateway.addEvidence).toHaveBeenCalledWith("sesi-1", "snap-1", 2, LINK);
    await waitFor(() => expect(gateway.listEvidence).toHaveBeenCalledTimes(2));
    expect(result.current.error).toBeNull();
  });

  // Negative: the 4th item never reaches the server.
  it("refuses a 4th item on the client with the limit message", async () => {
    // Arrange
    const gateway = fake([item("e-1"), item("e-2"), item("e-3")]);
    const { result } = await setup(gateway);

    // Act
    await act(async () => result.current.add(LINK));

    // Assert
    expect(gateway.addEvidence).not.toHaveBeenCalled();
    expect(result.current.error).toContain("batas 3 per jawaban");
  });

  // Negative: a wrong type is refused on the client.
  it("refuses a file of the wrong type", async () => {
    // Arrange
    const gateway = fake([]);
    const { result } = await setup(gateway);
    const gif = new File(["x"], "a.gif", { type: "image/gif" });

    // Act
    await act(async () => result.current.add({ kind: "file", file: gif }));

    // Assert
    expect(gateway.addEvidence).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Hanya berkas PNG, JPG, atau PDF yang boleh diunggah.");
  });

  // Negative: the server can still refuse (413, 409 race) and the message is shown.
  it("shows the server message when the upload is refused", async () => {
    // Arrange
    const gateway = fake([]);
    gateway.addEvidence.mockRejectedValue(new ApiError(413, "EVIDENCE_TOO_LARGE"));
    const { result } = await setup(gateway);

    // Act
    await act(async () => result.current.add(LINK));

    // Assert
    expect(result.current.error).toBe("Berkas bukti melebihi batas ukuran yang ditetapkan tim.");
    expect(gateway.listEvidence).toHaveBeenCalledTimes(1);
  });

  // Edge: nothing can be added before the list is known, the count is unknown.
  it("does nothing while the list is still loading", async () => {
    // Arrange
    const gateway = fake([]);
    gateway.listEvidence.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useManualEvidence(gateway as unknown as ManualAnswerGateway, "sesi-1", "snap-1", 2));

    // Act
    await act(async () => result.current.add(LINK));

    // Assert
    expect(gateway.addEvidence).not.toHaveBeenCalled();
  });

  // Edge: a second click while the first upload is in flight is ignored.
  it("ignores a second add while one is in flight", async () => {
    // Arrange
    const gateway = fake([]);
    let finish: (value: EvidenceRead) => void = () => undefined;
    gateway.addEvidence.mockImplementation(() => new Promise<EvidenceRead>((resolve) => (finish = resolve)));
    const { result } = await setup(gateway);

    // Act
    act(() => void result.current.add(LINK));
    const busyWhileUploading = result.current.busy;
    await act(async () => result.current.add(LINK));
    await act(async () => finish(item("baru")));

    // Assert
    expect(busyWhileUploading).toBe(true);
    expect(gateway.addEvidence).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(false);
  });
});

describe("remove and download", () => {
  // Positive.
  it("deletes an item and loads the list again", async () => {
    // Arrange
    const gateway = fake([item("e-1")]);
    const { result } = await setup(gateway);

    // Act
    await act(async () => result.current.remove("e-1"));

    // Assert
    expect(gateway.deleteEvidence).toHaveBeenCalledWith("sesi-1", "e-1");
    await waitFor(() => expect(gateway.listEvidence).toHaveBeenCalledTimes(2));
  });

  // Negative: a refused delete shows the message and keeps the list.
  it("shows the message when a delete fails", async () => {
    // Arrange
    const gateway = fake([item("e-1")]);
    gateway.deleteEvidence.mockRejectedValue(new ApiError(404, "EVIDENCE_NOT_FOUND"));
    const { result } = await setup(gateway);

    // Act
    await act(async () => result.current.remove("e-1"));

    // Assert
    expect(result.current.error).toBe("Bukti tidak ditemukan. Mungkin sudah dihapus.");
  });

  // Positive: the file is fetched with the session cookie and saved under its own name.
  it("downloads a file under its file name", async () => {
    // Arrange
    const gateway = fake([]);
    const blob = new Blob(["%PDF"]);
    gateway.downloadEvidence.mockResolvedValue(blob);
    const { result } = await setup(gateway);
    const file = item("e-9", { kind: "file", file_name: "bukti.pdf", url: null });

    // Act
    await act(async () => result.current.download(file));

    // Assert
    expect(gateway.downloadEvidence).toHaveBeenCalledWith("sesi-1", "e-9");
    expect(saveBlob).toHaveBeenCalledWith(blob, "bukti.pdf");
    expect(gateway.listEvidence).toHaveBeenCalledTimes(1);
  });

  // Edge: a file without a stored name gets a generic one.
  it("uses a generic file name when none is stored", async () => {
    // Arrange
    const gateway = fake([]);
    const { result } = await setup(gateway);

    // Act
    await act(async () => result.current.download(item("e-9", { kind: "file", file_name: null, url: null })));

    // Assert
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toBe("bukti-jawaban");
  });

  // Negative: a failed download is a message.
  it("shows the message when the download fails", async () => {
    // Arrange
    const gateway = fake([]);
    gateway.downloadEvidence.mockRejectedValue(new ApiError(404, "EVIDENCE_NOT_FOUND"));
    const { result } = await setup(gateway);

    // Act
    await act(async () => result.current.download(item("e-9", { kind: "file", file_name: "a.pdf", url: null })));

    // Assert
    expect(result.current.error).toBe("Bukti tidak ditemukan. Mungkin sudah dihapus.");
    expect(saveBlob).not.toHaveBeenCalled();
  });
});

describe("add result (the panel clears its field only when the item was added)", () => {
  // Positive.
  it("returns true when the item was added", async () => {
    // Arrange
    const gateway = fake([]);
    const { result } = await setup(gateway);

    // Act
    let added: boolean | undefined;
    await act(async () => {
      added = await result.current.add(LINK);
    });

    // Assert
    expect(added).toBe(true);
  });

  // Negative: refused on the client, refused by the server, and not ready yet all return false.
  it("returns false when the client refuses the item", async () => {
    // Arrange
    const gateway = fake([item("e-1"), item("e-2"), item("e-3")]);
    const { result } = await setup(gateway);

    // Act
    let added: boolean | undefined;
    await act(async () => {
      added = await result.current.add(LINK);
    });

    // Assert
    expect(added).toBe(false);
  });

  it("returns false when the server refuses the item", async () => {
    // Arrange
    const gateway = fake([]);
    gateway.addEvidence.mockRejectedValue(new ApiError(409, "EVIDENCE_LIMIT_REACHED"));
    const { result } = await setup(gateway);

    // Act
    let added: boolean | undefined;
    await act(async () => {
      added = await result.current.add(LINK);
    });

    // Assert
    expect(added).toBe(false);
  });

  it("returns false while the list is still loading", async () => {
    // Arrange
    const gateway = fake([]);
    gateway.listEvidence.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useManualEvidence(gateway as unknown as ManualAnswerGateway, "sesi-1", "snap-1", 2));

    // Act
    let added: boolean | undefined;
    await act(async () => {
      added = await result.current.add(LINK);
    });

    // Assert
    expect(added).toBe(false);
  });
});
