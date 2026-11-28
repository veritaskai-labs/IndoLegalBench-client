import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GlobalSearchState } from "@/hooks/useGlobalSearch";
import { SEARCH_GROUP_CAP, toGroups, type SearchResponse } from "@/lib/search/searchResults";
import { SearchResults } from "./SearchResults";

const EMPTY: SearchResponse = { suites: [], cases: [], sessions: [] };

const RESPONSE: SearchResponse = {
  suites: [
    { id: "s-1", label: "Suite Pidana Dasar", archived: false },
    { id: "s-2", label: "Suite Perdata Lama", archived: true },
  ],
  cases: [{ id: "c-1", label: "Pencurian ringan", archived: false, case_code: "PID-001" }],
  sessions: [
    { id: "r-1", label: "Sesi Oktober", archived: false, session_type: "automatic", destination: "automatic_detail" },
  ],
};

function done(response: SearchResponse, role: "admin" | "developer_ai" = "admin"): GlobalSearchState {
  return { status: "done", q: "pidana", groups: toGroups(response, role) };
}

function show(state: GlobalSearchState) {
  const onRetry = vi.fn();
  const onChoose = vi.fn();
  render(<SearchResults state={state} onRetry={onRetry} onChoose={onChoose} />);
  return { onRetry, onChoose };
}

describe("SearchResults (SCRUM-352)", () => {
  it("shows Suite, Kasus and Sesi pengukuran with their counts, in that order (AC1)", () => {
    show(done(RESPONSE));

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Suite (2)", "Kasus (1)", "Sesi pengukuran (1)"]);
  });

  it("lists each hit as a link to its page", () => {
    show(done(RESPONSE));

    expect(screen.getByRole("link", { name: /Suite Pidana Dasar/ })).toHaveAttribute("href", "/suites/s-1");
    expect(screen.getByRole("link", { name: /Pencurian ringan/ })).toHaveAttribute("href", "/cases/c-1/edit");
    expect(screen.getByRole("link", { name: /Sesi Oktober/ })).toHaveAttribute("href", "/runs/r-1");
  });

  it("shows the case code and the session type next to the label", () => {
    show(done(RESPONSE));

    expect(within(screen.getByRole("link", { name: /Pencurian ringan/ })).getByText("PID-001")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /Sesi Oktober/ })).getByText("Otomatis")).toBeInTheDocument();
  });

  it("labels archived items with Arsip and leaves the others plain (AC3)", () => {
    show(done(RESPONSE));

    expect(within(screen.getByRole("link", { name: /Suite Perdata Lama/ })).getByText("Arsip")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /Suite Pidana Dasar/ })).queryByText("Arsip")).toBeNull();
  });

  it("hides groups without hits", () => {
    show(done({ ...EMPTY, cases: RESPONSE.cases }));

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Kasus (1)"]);
  });

  it("announces the number of results politely", () => {
    show(done(RESPONSE));

    expect(screen.getByRole("status")).toHaveTextContent("4 hasil");
  });

  it("asks to narrow the keyword under a group that hit the 20 cap, and not under a smaller one", () => {
    const cases = Array.from({ length: SEARCH_GROUP_CAP }, (_, i) => ({
      id: `c-${i}`,
      label: `Kasus ${i}`,
      archived: false,
      case_code: `PID-${i}`,
    }));
    show(done({ ...EMPTY, cases, suites: RESPONSE.suites }));

    expect(screen.getAllByText("Menampilkan 20 hasil pertama. Perjelas kata kunci untuk mempersempit.")).toHaveLength(1);
  });

  it("says nothing matched, quoting the keyword", () => {
    show(done(EMPTY));

    expect(screen.getByText("Tidak ada hasil untuk “pidana”.")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows a loading status while searching", () => {
    show({ status: "loading", q: "pidana" });

    expect(screen.getByRole("status")).toHaveTextContent("Mencari…");
  });

  it("asks for a second character", () => {
    show({ status: "tooShort" });

    expect(screen.getByText("Ketik minimal 2 karakter.")).toBeInTheDocument();
  });

  it("says the keyword is too long", () => {
    show({ status: "tooLong" });

    expect(screen.getByText("Kata kunci paling banyak 200 karakter.")).toBeInTheDocument();
  });

  it("says the keyword is not valid on a 422", () => {
    show({ status: "invalid", q: "​​" });

    expect(screen.getByText("Kata kunci tidak valid. Gunakan huruf atau angka.")).toBeInTheDocument();
  });

  it("offers Coba lagi when the search failed", async () => {
    const { onRetry } = show({ status: "failed", q: "pidana" });

    expect(screen.getByRole("alert")).toHaveTextContent("Pencarian gagal.");
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while idle", () => {
    const { container } = render(<SearchResults state={{ status: "idle" }} onRetry={vi.fn()} onChoose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("tells the parent when a result is chosen", async () => {
    const { onChoose } = show(done(RESPONSE));

    await userEvent.click(screen.getByRole("link", { name: /Suite Pidana Dasar/ }));

    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("prints labels from the server as text, never as markup (OWASP A03)", () => {
    const label = '<img src=x onerror="alert(1)">';
    const { container } = render(
      <SearchResults
        state={done({ ...EMPTY, suites: [{ id: "s-x", label, archived: false }] })}
        onRetry={vi.fn()}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
