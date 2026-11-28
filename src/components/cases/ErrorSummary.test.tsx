import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ErrorSummary } from "./ErrorSummary";

describe("ErrorSummary", () => {
  it("counts the fields to check in English and keeps the field message", () => {
    render(
      <LocaleProvider locale="en">
        <ErrorSummary
          issues={[{ path: "identity.title", message: "Judul wajib diisi." }]}
          onSelect={vi.fn()}
        />
      </LocaleProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Check the following 1 fields before saving:");
    expect(screen.getByRole("button", { name: "Judul wajib diisi." })).toBeInTheDocument();
  });
});
