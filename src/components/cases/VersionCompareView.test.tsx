import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { compareCaseVersions } from "@/lib/cases/versionApi";
import { makeCompare, makeSections, makeSide, makeSummary } from "@/test/versionFixtures";
import { VersionCompareView } from "./VersionCompareView";

vi.mock("@/lib/cases/versionApi", () => ({ compareCaseVersions: vi.fn() }));

const compareMock = vi.mocked(compareCaseVersions);

// Newest first, the way the history tab hands them over.
const versions = [makeSummary(3, { status: "draft" }), makeSummary(2), makeSummary(1)];

/** Version 2 against version 3, each with a title that names its version. */
function comparison(changed: string[]) {
  const titled = (versionNo: number) =>
    makeSide(versionNo, { sections: makeSections({ "identity.title": `Judul versi ${versionNo}` }) });
  return makeCompare({ a: titled(2), b: titled(3), changed });
}

const pressCompare = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Bandingkan" }));

beforeEach(() => {
  compareMock.mockReset();
});

describe("VersionCompareView", () => {
  // Positive: AC4, pick two versions.
  it("offers every version in both lists and starts with the two newest", () => {
    // Arrange / Act
    render(<VersionCompareView caseId="case-1" versions={versions} />);

    // Assert
    expect(screen.getByLabelText("Versi A")).toHaveValue("2");
    expect(screen.getByLabelText("Versi B")).toHaveValue("3");
    expect(screen.getAllByRole("option", { name: "Versi 3 (Draft)" })).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: "Versi 1 (Disetujui)" })).toHaveLength(2);
  });

  it("does not ask the server until the button is pressed", () => {
    // Arrange / Act
    render(<VersionCompareView caseId="case-1" versions={versions} />);

    // Assert
    expect(compareMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("compares the chosen versions and shows them side by side", async () => {
    // Arrange
    const user = userEvent.setup();
    compareMock.mockResolvedValue(comparison(["identity.title"]));
    render(<VersionCompareView caseId="case-1" versions={versions} />);

    // Act
    await user.selectOptions(screen.getByLabelText("Versi A"), "1");
    await pressCompare(user);

    // Assert
    expect(compareMock).toHaveBeenCalledTimes(1);
    expect(compareMock).toHaveBeenCalledWith("case-1", 1, 3);
    expect(await screen.findByText("Judul versi 2")).toBeInTheDocument();
    expect(screen.getByText("Berubah")).toBeInTheDocument();
  });

  it("shows a loading state while comparing and disables the button", async () => {
    // Arrange
    const user = userEvent.setup();
    compareMock.mockReturnValue(new Promise(() => undefined));
    render(<VersionCompareView caseId="case-1" versions={versions} />);

    // Act
    await pressCompare(user);

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Membandingkan versi…");
    expect(screen.getByRole("button", { name: "Bandingkan" })).toBeDisabled();
  });

  // Negative
  it("shows the error and compares again on retry", async () => {
    // Arrange
    const user = userEvent.setup();
    compareMock.mockRejectedValueOnce(new ApiError(404, "VERSION_NOT_FOUND"));
    compareMock.mockResolvedValueOnce(comparison([]));
    render(<VersionCompareView caseId="case-1" versions={versions} />);
    await pressCompare(user);
    await screen.findByRole("alert");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(compareMock).toHaveBeenCalledTimes(2);
    expect(compareMock).toHaveBeenLastCalledWith("case-1", 2, 3);
    expect(await screen.findByText("Tidak ada bagian yang berubah di antara kedua versi.")).toBeInTheDocument();
  });

  it("shows the reason when the server rejects the version numbers", async () => {
    // Arrange
    const user = userEvent.setup();
    compareMock.mockRejectedValue(new ApiError(422, "VALIDATION_ERROR"));
    render(<VersionCompareView caseId="case-1" versions={versions} />);

    // Act
    await pressCompare(user);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pilih dua nomor versi yang valid untuk dibandingkan.",
    );
  });

  // Edge: the same version on both sides is allowed and the server answers it.
  it("can compare a version with itself and says nothing changed", async () => {
    // Arrange
    const user = userEvent.setup();
    compareMock.mockResolvedValue(comparison([]));
    render(<VersionCompareView caseId="case-1" versions={versions} />);
    await user.selectOptions(screen.getByLabelText("Versi A"), "3");

    // Act
    await pressCompare(user);

    // Assert
    expect(compareMock).toHaveBeenCalledWith("case-1", 3, 3);
    expect(await screen.findByRole("status")).toHaveTextContent("Tidak ada bagian yang berubah");
  });

  // Edge: exactly two versions.
  it("starts with the only two versions chosen", () => {
    // Arrange
    const two = [makeSummary(2), makeSummary(1)];

    // Act
    render(<VersionCompareView caseId="case-1" versions={two} />);

    // Assert
    expect(screen.getByLabelText("Versi A")).toHaveValue("1");
    expect(screen.getByLabelText("Versi B")).toHaveValue("2");
  });

  // Edge: nothing to compare yet, must not crash.
  it.each([
    ["one version", [makeSummary(1)]],
    ["no versions", []],
  ])("explains that two versions are needed when there is %s", (_label, few) => {
    // Arrange / Act
    render(<VersionCompareView caseId="case-1" versions={few} />);

    // Assert
    expect(screen.getByText("Perlu minimal dua versi untuk dibandingkan.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bandingkan" })).not.toBeInTheDocument();
  });
});
