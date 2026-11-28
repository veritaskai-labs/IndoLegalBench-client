import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { SessionListItem } from "@/types/measurement";
import { SessionTable } from "./SessionTable";

function session(): SessionListItem {
  return {
    id: "s-1",
    label: "Uji Coba DeepSeek",
    created_at: "2026-11-03T02:00:00Z",
    created_by: "dev-1",
    created_by_name: "Uji Developer AI",
    product_id: "p-1",
    product_name: "DeepSeek",
    case_count: 20,
    repetitions: 3,
    status: "finished",
    session_type: "automatic",
    progress: { completed: 60, total: 60, completed_cases: 20, total_cases: 20, percent_cases_complete: 100 },
  };
}

describe("SessionTable English", () => {
  it("names View details in English and leaves the session label unchanged", () => {
    render(
      <LocaleProvider locale="en">
        <SessionTable sessions={[session()]} loading={false} renderAction={() => null} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("link", { name: "View details Uji Coba DeepSeek" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Uji Coba DeepSeek" })).toBeInTheDocument();
  });
});
