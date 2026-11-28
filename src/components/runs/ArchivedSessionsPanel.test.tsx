import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ArchivedSessionsPanel } from "./ArchivedSessionsPanel";

vi.mock("@/hooks/useSessions", () => ({
  useSessions: () => ({ status: "ready", data: [], reload: vi.fn() }),
}));

vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

describe("ArchivedSessionsPanel English", () => {
  it("explains an empty archive in English", () => {
    render(
      <LocaleProvider locale="en">
        <ArchivedSessionsPanel me={null} />
      </LocaleProvider>,
    );
    expect(screen.getByText("No archived sessions yet")).toBeInTheDocument();
  });
});
