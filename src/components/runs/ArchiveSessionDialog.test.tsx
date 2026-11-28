import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ArchiveSessionDialog } from "./ArchiveSessionDialog";

describe("ArchiveSessionDialog English", () => {
  it("names the dialog in English and leaves the session label unchanged", () => {
    render(
      <LocaleProvider locale="en">
        <ArchiveSessionDialog session={{ id: "s-1", label: "Run November" }} onArchived={vi.fn()} onClose={vi.fn()} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("dialog", { name: "Archive session?" })).toBeInTheDocument();
    expect(screen.getByText(/Run November/)).toBeInTheDocument();
  });
});
