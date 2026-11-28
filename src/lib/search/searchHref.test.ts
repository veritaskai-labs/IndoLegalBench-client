import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SESSION_ROUTE, caseHref, suiteHref } from "./searchHref";

const ID = "3f2c1a00-0000-4000-8000-000000000001";

type Kontrak = {
  components?: { schemas?: Record<string, { properties?: Record<string, { enum?: string[] }> }> };
};

function tujuanDariKontrak(): string[] {
  const kontrak = JSON.parse(readFileSync(resolve(process.cwd(), "contract/openapi.json"), "utf8")) as Kontrak;
  const tujuan = kontrak.components?.schemas?.SessionSearchHit?.properties?.destination?.enum;
  if (!tujuan) {
    throw new Error("SessionSearchHit.destination tidak ada di contract/openapi.json. Jalankan npm run gen:api.");
  }
  return tujuan;
}

describe("session destinations (SCRUM-352)", () => {
  it("opens an automatic session on its run page", () => {
    expect(SESSION_ROUTE.automatic_detail(ID)).toBe(`/runs/${ID}`);
  });

  it("opens a manual session on its manual run page", () => {
    expect(SESSION_ROUTE.manual_detail(ID)).toBe(`/manual-runs/${ID}`);
  });

  it("opens a graded session on its grading results", () => {
    expect(SESSION_ROUTE.grading_results(ID)).toBe(`/reports/sessions/${ID}`);
  });

  it("has a route for every destination in the contract, no more and no less", () => {
    expect(Object.keys(SESSION_ROUTE).sort()).toEqual([...tujuanDariKontrak()].sort());
  });

  it("encodes the id, so a strange id cannot change the path", () => {
    expect(SESSION_ROUTE.automatic_detail("a/b?c#d")).toBe("/runs/a%2Fb%3Fc%23d");
    expect(SESSION_ROUTE.manual_detail("../x")).toBe("/manual-runs/..%2Fx");
    expect(SESSION_ROUTE.grading_results("a b")).toBe("/reports/sessions/a%20b");
  });
});

describe("suiteHref", () => {
  it("opens the suite page with an encoded id", () => {
    expect(suiteHref(ID)).toBe(`/suites/${ID}`);
    expect(suiteHref("a/b")).toBe("/suites/a%2Fb");
  });
});

describe("caseHref", () => {
  it("opens the read view for Developer AI, who cannot edit", () => {
    expect(caseHref(ID, "developer_ai")).toBe(`/cases/${ID}`);
  });

  it.each(["admin", "contributor"] as const)("opens the editor for %s", (role) => {
    expect(caseHref(ID, role)).toBe(`/cases/${ID}/edit`);
  });

  it("encodes the id", () => {
    expect(caseHref("a/b", "admin")).toBe("/cases/a%2Fb/edit");
    expect(caseHref("a/b", "developer_ai")).toBe("/cases/a%2Fb");
  });
});
