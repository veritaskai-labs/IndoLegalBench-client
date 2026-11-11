import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveBlob } from "./browserDownload";

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  createObjectURL.mockReturnValue("blob:fake-url");
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  createObjectURL.mockReset();
  revokeObjectURL.mockReset();
});

describe("saveBlob", () => {
  // Positive: a temporary link with the file name is clicked once.
  it("clicks a download link that has the file name and the blob url", () => {
    // Arrange
    const clicked: Array<{ href: string; download: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download });
    });
    const blob = new Blob(["%PDF"], { type: "application/pdf" });

    // Act
    saveBlob(blob, "bukti.pdf");

    // Assert
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([{ href: "blob:fake-url", download: "bukti.pdf" }]);
  });

  // Edge: nothing is left behind, neither in the page nor in memory.
  it("removes the link and releases the blob url", () => {
    // Arrange
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    // Act
    saveBlob(new Blob(["x"]), "bukti.png");
    vi.runAllTimers();

    // Assert
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  // Edge: Safari can cancel the download if the url is revoked in the same tick as the click.
  it("does not release the blob url in the same tick as the click", () => {
    // Arrange
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    // Act
    saveBlob(new Blob(["x"]), "bukti.png");

    // Assert
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  // Negative: if the browser refuses the click the blob url is still released.
  it("releases the blob url even when the click throws", () => {
    // Arrange
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("diblokir");
    });

    // Act
    const call = () => saveBlob(new Blob(["x"]), "bukti.png");

    // Assert
    expect(call).toThrow("diblokir");
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
