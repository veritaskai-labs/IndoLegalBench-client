import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchAll } from "@/lib/search/searchApi";
import { SEARCH_DEBOUNCE_MS } from "@/lib/search/searchQuery";
import type { SearchResponse } from "@/lib/search/searchResults";
import { GlobalSearch } from "./GlobalSearch";

// The API is mocked (its HTTP shape is tested in searchApi.test.ts) and next/navigation is mocked so a
// test can move to another page and check that the panel closes. Fake timers drive the 300 ms debounce.
vi.mock("@/lib/search/searchApi", () => ({ searchAll: vi.fn() }));
const searchMock = vi.mocked(searchAll);

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn(() => "/dashboard") }));
vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));

const RESPONSE: SearchResponse = {
  suites: [{ id: "s-1", label: "Suite Pidana Dasar", archived: false }],
  cases: [{ id: "c-1", label: "Pencurian ringan", archived: false, case_code: "PID-001" }],
  sessions: [],
};

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const view = render(
    <div>
      <GlobalSearch role="admin" />
      <p>Isi halaman</p>
    </div>,
  );
  return { user, ...view };
}

const box = () => screen.getByRole("searchbox", { name: "Cari suite, kasus, dan sesi" });

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  });
}

async function searchFor(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(box());
  await user.type(box(), text);
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  searchMock.mockReset();
  searchMock.mockResolvedValue(RESPONSE);
  pathnameMock.mockReturnValue("/dashboard");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GlobalSearch (SCRUM-352)", () => {
  it("is a search landmark with a labelled search box", () => {
    setup();

    expect(screen.getByRole("search")).toContainElement(box());
    expect(box()).toHaveAttribute("placeholder", "Cari suite, kasus, sesi…");
  });

  it("shows nothing until the user types", () => {
    setup();

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows grouped results after typing (AC1)", async () => {
    const { user } = setup();

    await searchFor(user, "pidana");

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /Suite Pidana Dasar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pencurian ringan/ })).toBeInTheDocument();
  });

  it("sends at once on Enter", async () => {
    const { user } = setup();

    await user.click(box());
    await user.type(box(), "pidana{Enter}");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and keeps focus in the box", async () => {
    const { user } = setup();
    await searchFor(user, "pidana");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("link")).toBeNull();
    expect(box()).toHaveFocus();
  });

  it("opens again when the user types after Escape", async () => {
    const { user } = setup();
    await searchFor(user, "pidana");
    await user.keyboard("{Escape}");

    await user.type(box(), "x");
    await settle();

    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("closes on a click outside and opens again when the box is focused", async () => {
    const { user } = setup();
    await searchFor(user, "pidana");

    await user.click(screen.getByText("Isi halaman"));
    expect(screen.queryByRole("link")).toBeNull();

    await user.click(box());
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("stays open on a click inside the panel", async () => {
    const { user } = setup();
    await searchFor(user, "pidana");

    await user.click(screen.getByRole("heading", { name: "Suite (1)" }));

    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("moves through the results with the arrow keys", async () => {
    const { user } = setup();
    await searchFor(user, "pidana");
    const [first, second] = screen.getAllByRole("link");

    await user.keyboard("{ArrowDown}");
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(box()).toHaveFocus();
  });

  it("ignores arrow keys when there are no links", async () => {
    searchMock.mockResolvedValue({ suites: [], cases: [], sessions: [] });
    const { user } = setup();
    await searchFor(user, "pidana");

    await user.keyboard("{ArrowDown}");

    expect(box()).toHaveFocus();
  });

  it("clears and closes after a result is chosen", async () => {
    const { user } = setup();
    await searchFor(user, "pidana");

    await user.click(screen.getByRole("link", { name: /Suite Pidana Dasar/ }));

    expect(box()).toHaveValue("");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("closes when the page changes", async () => {
    const { user, rerender } = setup();
    await searchFor(user, "pidana");

    pathnameMock.mockReturnValue("/suites");
    rerender(
      <div>
        <GlobalSearch role="admin" />
        <p>Isi halaman</p>
      </div>,
    );

    expect(screen.queryByRole("link")).toBeNull();
  });

  describe("on phones", () => {
    const magnifier = () => screen.getByRole("button", { name: "Cari" });

    it("opens a full-width search row from the magnifier, with the box focused", async () => {
      const { user } = setup();
      expect(magnifier()).toHaveAttribute("aria-expanded", "false");

      await user.click(magnifier());

      expect(magnifier()).toHaveAttribute("aria-expanded", "true");
      expect(box()).toHaveFocus();
      expect(screen.getByRole("button", { name: "Batal" })).toBeInTheDocument();
    });

    it("closes the row with Batal, clears it and returns focus to the magnifier", async () => {
      const { user } = setup();
      await user.click(magnifier());
      await user.type(box(), "pidana");
      await settle();

      await user.click(screen.getByRole("button", { name: "Batal" }));

      expect(magnifier()).toHaveAttribute("aria-expanded", "false");
      expect(magnifier()).toHaveFocus();
      expect(box()).toHaveValue("");
      expect(screen.queryByRole("link")).toBeNull();
    });

    it("closes the row on Escape and returns focus to the magnifier", async () => {
      const { user } = setup();
      await user.click(magnifier());

      await user.keyboard("{Escape}");

      expect(magnifier()).toHaveAttribute("aria-expanded", "false");
      expect(magnifier()).toHaveFocus();
    });

    it("closes the row after a result is chosen", async () => {
      const { user } = setup();
      await user.click(magnifier());
      await user.type(box(), "pidana");
      await settle();

      await user.click(screen.getByRole("link", { name: /Pencurian ringan/ }));

      expect(magnifier()).toHaveAttribute("aria-expanded", "false");
    });
  });
});
