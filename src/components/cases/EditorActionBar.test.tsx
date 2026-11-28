import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { EditorActionBar } from "./EditorActionBar";

describe("EditorActionBar", () => {
  it("says Save draft in English", () => {
    render(
      <LocaleProvider locale="en">
        <EditorActionBar saving={false} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
  });
});
