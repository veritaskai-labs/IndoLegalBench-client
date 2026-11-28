import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ActiveSessionsPanel } from "./ActiveSessionsPanel";

vi.mock("@/hooks/useSessions", () => ({
  useSessions: () => ({ status: "ready", data: [], reload: vi.fn() }),
}));

vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

describe("ActiveSessionsPanel English", () => {
  it("explains an empty list in English", () => {
    render(
      <LocaleProvider locale="en">
        <ActiveSessionsPanel me={null} />
      </LocaleProvider>,
    );
    expect(screen.getByText("No measurement sessions yet")).toBeInTheDocument();
  });
});
