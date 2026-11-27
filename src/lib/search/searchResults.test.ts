import { describe, expect, it } from "vitest";
import { SEARCH_GROUP_CAP, canSearch, resultCount, toGroups, type SearchResponse } from "./searchResults";

const EMPTY: SearchResponse = { suites: [], cases: [], sessions: [] };

const suite = (n: number, archived = false) => ({ id: `s-${n}`, label: `Suite ${n}`, archived });
const kasus = (n: number, archived = false) => ({
  id: `c-${n}`,
  label: `Kasus ${n}`,
  archived,
  case_code: `PID-${String(n).padStart(3, "0")}`,
});

describe("toGroups (SCRUM-352)", () => {
  it("returns no groups when nothing matched", () => {
    expect(toGroups(EMPTY, "admin")).toEqual([]);
  });

  it("keeps the order Suite, Kasus, Sesi pengukuran whatever the JSON key order", () => {
    const response = {
      sessions: [{ id: "r-1", label: "Sesi Okt", archived: false, session_type: "automatic", destination: "automatic_detail" }],
      cases: [kasus(1)],
      suites: [suite(1)],
    } satisfies SearchResponse;

    const groups = toGroups(response, "admin");

    expect(groups.map((g) => [g.key, g.heading])).toEqual([
      ["suites", "Suite"],
      ["cases", "Kasus"],
      ["sessions", "Sesi pengukuran"],
    ]);
  });

  it("drops empty groups and keeps the rest", () => {
    const groups = toGroups({ ...EMPTY, cases: [kasus(7)] }, "admin");

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: "cases", capped: false });
  });

  it("builds suite rows without meta and with the archive flag", () => {
    const [group] = toGroups({ ...EMPTY, suites: [suite(1), suite(2, true)] }, "admin");

    expect(group?.rows).toEqual([
      { id: "s-1", href: "/suites/s-1", label: "Suite 1", meta: null, archived: false },
      { id: "s-2", href: "/suites/s-2", label: "Suite 2", meta: null, archived: true },
    ]);
  });

  it("shows the case code and links the case by role", () => {
    const response = { ...EMPTY, cases: [kasus(1, true)] };

    expect(toGroups(response, "contributor")[0]?.rows[0]).toEqual({
      id: "c-1",
      href: "/cases/c-1/edit",
      label: "Kasus 1",
      meta: "PID-001",
      archived: true,
    });
    expect(toGroups(response, "developer_ai")[0]?.rows[0]?.href).toBe("/cases/c-1");
  });

  it("labels sessions by type and follows the destination the server chose", () => {
    const response = {
      ...EMPTY,
      sessions: [
        { id: "r-1", label: "Otomatis Okt", archived: false, session_type: "automatic", destination: "automatic_detail" },
        { id: "r-2", label: "Manual Okt", archived: true, session_type: "manual", destination: "manual_detail" },
        { id: "r-3", label: "Dinilai Okt", archived: false, session_type: "automatic", destination: "grading_results" },
      ],
    } satisfies SearchResponse;

    expect(toGroups(response, "contributor")[0]?.rows).toEqual([
      { id: "r-1", href: "/runs/r-1", label: "Otomatis Okt", meta: "Otomatis", archived: false },
      { id: "r-2", href: "/manual-runs/r-2", label: "Manual Okt", meta: "Manual", archived: true },
      { id: "r-3", href: "/reports/sessions/r-3", label: "Dinilai Okt", meta: "Otomatis", archived: false },
    ]);
  });

  it("adds nothing the server did not return (role limits stay on the server)", () => {
    const groups = toGroups({ ...EMPTY, cases: [kasus(1)] }, "developer_ai");

    expect(groups.flatMap((g) => g.rows)).toHaveLength(1);
  });

  it("marks a group capped at exactly the server cap, not one below", () => {
    const full = Array.from({ length: SEARCH_GROUP_CAP }, (_, i) => kasus(i + 1));

    expect(SEARCH_GROUP_CAP).toBe(20);
    expect(toGroups({ ...EMPTY, cases: full }, "admin")[0]?.capped).toBe(true);
    expect(toGroups({ ...EMPTY, cases: full.slice(1) }, "admin")[0]?.capped).toBe(false);
  });
});

describe("resultCount", () => {
  it("adds up the rows of every group", () => {
    const groups = toGroups({ ...EMPTY, suites: [suite(1), suite(2)], cases: [kasus(1)] }, "admin");

    expect(resultCount(groups)).toBe(3);
    expect(resultCount([])).toBe(0);
  });
});

describe("canSearch", () => {
  it.each(["admin", "contributor", "developer_ai"] as const)("lets %s search", (role) => {
    expect(canSearch(role)).toBe(true);
  });

  it("hides search from Viewer, who may not see test-case content (PO 27 Nov, PBI-16)", () => {
    expect(canSearch("viewer")).toBe(false);
  });
});
