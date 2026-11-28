import { describe, expect, it } from "vitest";
import { resultLinks } from "./resultLinks";

function link(label: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = `/x/${label}`;
  a.textContent = label;
  return a;
}

function group(...children: HTMLElement[]): HTMLElement {
  const section = document.createElement("section");
  section.append(...children);
  return section;
}

function panelWith(...children: HTMLElement[]): HTMLDivElement {
  const panel = document.createElement("div");
  panel.append(...children);
  return panel;
}

describe("resultLinks (SCRUM-352)", () => {
  it("returns the result links in screen order, across groups", () => {
    const panel = panelWith(group(link("A"), link("B")), group(link("C")));

    expect(resultLinks(panel).map((a) => a.textContent)).toEqual(["A", "B", "C"]);
  });

  it("ignores buttons in the panel, such as Coba lagi", () => {
    const retry = document.createElement("button");
    retry.textContent = "Coba lagi";

    expect(resultLinks(panelWith(retry))).toEqual([]);
  });

  it("returns nothing before the panel is mounted", () => {
    expect(resultLinks(null)).toEqual([]);
  });

  it("only looks inside the panel, not the whole page", () => {
    const outside = link("dashboard");
    document.body.append(outside);
    try {
      expect(resultLinks(panelWith(link("A")))).toHaveLength(1);
    } finally {
      outside.remove();
    }
  });
});
