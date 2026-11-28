import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { messages } from "./locale";
import { LocaleProvider, useLocale, useText } from "./LocaleProvider";

function LocaleProbe() {
  return <span>{useLocale()}</span>;
}

describe("LocaleProvider", () => {
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
