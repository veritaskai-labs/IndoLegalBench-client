import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOAST_DURATION_MS, ToastProvider, useToast } from "./Toast";

function Trigger({ message }: { message: string }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message)}>
      {`tampilkan ${message}`}
    </button>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <Trigger message="Kasus tersimpan" />
      <Trigger message="Kasus diperbarui" />
    </ToastProvider>,
  );
}

function region() {
  return screen.getByRole("status", { name: "Notifikasi" });
}

// Fake timers: the toast hides itself after a delay, and we want to
// step through that delay instead of waiting for it in real time.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider", () => {
  // Positive
  it("keeps an empty live region mounted so screen readers announce later messages", () => {
    renderWithProvider();

    expect(region()).toBeEmptyDOMElement();
  });

  it("shows the message when a page calls showToast", () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "tampilkan Kasus tersimpan" }));

    expect(region()).toHaveTextContent("Kasus tersimpan");
  });

  it("hides the message after the display duration", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "tampilkan Kasus tersimpan" }));

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    });
    expect(region()).toHaveTextContent("Kasus tersimpan");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(region()).toBeEmptyDOMElement();
  });

  it("closes right away from the close button", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "tampilkan Kasus tersimpan" }));

    fireEvent.click(screen.getByRole("button", { name: "Tutup notifikasi" }));

    expect(region()).toBeEmptyDOMElement();
    expect(vi.getTimerCount()).toBe(0);
  });

  // Corner cases
  it("replaces an older message and restarts the timer", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "tampilkan Kasus tersimpan" }));
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    });

    fireEvent.click(screen.getByRole("button", { name: "tampilkan Kasus diperbarui" }));
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    });

    expect(region()).toHaveTextContent("Kasus diperbarui");
    expect(region()).not.toHaveTextContent("Kasus tersimpan");
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(region()).toBeEmptyDOMElement();
  });

  it("clears its timer when unmounted", () => {
    const { unmount } = renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "tampilkan Kasus tersimpan" }));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders the message as text, not HTML", () => {
    render(
      <ToastProvider>
        <Trigger message="<b>tebal</b>" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "tampilkan <b>tebal</b>" }));

    expect(region()).toHaveTextContent("<b>tebal</b>");
    expect(region().querySelector("b")).toBeNull();
  });

  // Negative
  it("throws a clear error when useToast is used outside ToastProvider", () => {
    // React logs the thrown error; silence it so the test output stays readable.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Trigger message="x" />)).toThrow(
      "useToast harus dipakai di dalam ToastProvider",
    );

    consoleError.mockRestore();
  });
});
