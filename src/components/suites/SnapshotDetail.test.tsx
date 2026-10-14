import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { getSnapshot } from "@/lib/suites/snapshotApi";
import { makeSnapshot, makeSnapshotItem } from "@/test/snapshotFixtures";
import { makeSections } from "@/test/versionFixtures";
import { SnapshotDetail } from "./SnapshotDetail";

vi.mock("@/lib/suites/snapshotApi", () => ({ getSnapshot: vi.fn() }));

const getMock = vi.mocked(getSnapshot);

beforeEach(() => {
  getMock.mockReset();
});

describe("SnapshotDetail", () => {
  // Positive: AC5, the snapshot together with what it contains.
  it("shows the snapshot time, author and each frozen case", async () => {
    // Arrange
    getMock.mockResolvedValue(
      makeSnapshot({
        items: [
          makeSnapshotItem(),
          makeSnapshotItem({
            case_id: "case-2",
            body: {
              version_no: 1,
              status: "approved",
              sections: makeSections({ case_code: "ILB-PT-0200", "identity.title": "Masa PKWT" }),
            },
          }),
        ],
      }),
    );

    // Act
    render(<SnapshotDetail snapshotId="snap-1" onClose={vi.fn()} />);
    const section = await screen.findByRole("region", { name: "Isi Snapshot 03 Okt 2026, 14.05 WIB" });

    // Assert
    expect(within(section).getByText("Oleh Aileen · 2 kasus")).toBeInTheDocument();
    // The code also appears inside the collapsed details, so look at the summary line only.
    const summaries = within(section).getAllByText(/ILB-PT-/, { selector: "summary span" });
    expect(summaries.map((code) => code.textContent)).toEqual(["ILB-PT-0142", "ILB-PT-0200"]);
    expect(within(section).getAllByText(/Masa PKWT/, { selector: "summary" })).toHaveLength(1);
    expect(within(section).getByText("Versi 2")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("snap-1");
  });

  it("lists the sections of a case with their content", async () => {
    // Arrange
    getMock.mockResolvedValue(
      makeSnapshot({
        items: [
          makeSnapshotItem({
            body: {
              version_no: 2,
              status: "approved",
              sections: makeSections({
                legal_refs: [{ regulation_type: "UU", regulation_number: "13", year: 2003, pasal: "151" }],
              }),
            },
          }),
        ],
      }),
    );

    // Act
    render(<SnapshotDetail snapshotId="snap-1" onClose={vi.fn()} />);
    await screen.findByRole("region");

    // Assert
    expect(screen.getByText("Rujukan hukum")).toBeInTheDocument();
    expect(screen.getByText("UU No. 13 Tahun 2003, Pasal 151")).toBeInTheDocument();
    expect(screen.getByText("Ketenagakerjaan")).toBeInTheDocument();
  });

  it("closes when asked to", async () => {
    // Arrange
    const user = userEvent.setup();
    const onClose = vi.fn();
    getMock.mockResolvedValue(makeSnapshot({ items: [makeSnapshotItem()] }));
    render(<SnapshotDetail snapshotId="snap-1" onClose={onClose} />);
    await screen.findByRole("region");

    // Act
    await user.click(screen.getByRole("button", { name: "Tutup" }));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // States
  it("shows a loading state", () => {
    // Arrange
    getMock.mockReturnValue(new Promise(() => undefined));

    // Act
    render(<SnapshotDetail snapshotId="snap-1" onClose={vi.fn()} />);

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Memuat isi snapshot…");
  });

  it("shows the error and loads again on retry", async () => {
    // Arrange
    const user = userEvent.setup();
    getMock.mockRejectedValueOnce(new ApiError(404, "SNAPSHOT_NOT_FOUND"));
    getMock.mockResolvedValueOnce(makeSnapshot({ items: [makeSnapshotItem()] }));
    render(<SnapshotDetail snapshotId="snap-1" onClose={vi.fn()} />);
    await screen.findByRole("alert");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByRole("region")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("says a snapshot without cases has nothing to show", async () => {
    // Arrange
    getMock.mockResolvedValue(makeSnapshot({ items: [] }));

    // Act
    render(<SnapshotDetail snapshotId="snap-1" onClose={vi.fn()} />);

    // Assert
    expect(await screen.findByText("Snapshot ini tidak berisi kasus")).toBeInTheDocument();
    expect(screen.queryByText("Judul")).not.toBeInTheDocument();
  });

  // Edge: an item whose body is broken still shows as a row instead of breaking the page.
  it("still shows a case whose frozen body has no sections", async () => {
    // Arrange
    getMock.mockResolvedValue(makeSnapshot({ items: [makeSnapshotItem({ body: {} })] }));

    // Act
    render(<SnapshotDetail snapshotId="snap-1" onClose={vi.fn()} />);
    await screen.findByRole("region");

    // Assert
    expect(screen.getByText("Tanpa ID")).toBeInTheDocument();
    expect(screen.getByText("Tanpa judul", { exact: false })).toBeInTheDocument();
  });
});
