import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { SessionStatusBadge } from "./SessionStatusBadge";

describe("SessionStatusBadge", () => {
  it("names a finished-with-failures session in Indonesian", () => {
    render(<SessionStatusBadge status="finished_with_failures" />);
    expect(screen.getByText("Selesai dengan kegagalan")).toBeInTheDocument();
  });

  it("names a system stop in English when that language is on screen", () => {
    render(
      <LocaleProvider locale="en">
        <SessionStatusBadge status="paused" stopReason="budget" />
      </LocaleProvider>,
    );
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });
});
