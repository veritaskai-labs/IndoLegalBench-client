import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "./locale";
import { resetMockLocale, setMockLocale } from "./localeMock";
import { LocaleProvider, useLocale, useText } from "./LocaleProvider";

function LocaleProbe() {
  return <span>{useLocale()}</span>;
}

describe("LocaleProvider", () => {
  afterEach(() => {
    resetMockLocale();
  });

  // SCRUM-356 is unfinished. The screen reads a mock, and the mock does not call the server.
  it("reads the mock language and does not ask the server", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    setMockLocale("en");

    render(<LocaleProbe />);

    expect(screen.getByText("en")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("speaks Indonesian when nobody has chosen a language", () => {
    render(<LocaleProbe />);
    expect(screen.getByText("id")).toBeInTheDocument();
  });

  it("speaks the language its provider was given", () => {
    render(
      <LocaleProvider locale="en">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByText("en")).toBeInTheDocument();
  });

  it("reads the catalog in the language on screen", () => {
    const copy = messages({
      id: { save: "Simpan" },
      en: { save: "Save" },
    });
    function SaveProbe() {
      return <button type="button">{useText(copy).save}</button>;
    }

    const { rerender } = render(<SaveProbe />);
    expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument();

    rerender(
      <LocaleProvider locale="en">
        <SaveProbe />
      </LocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
