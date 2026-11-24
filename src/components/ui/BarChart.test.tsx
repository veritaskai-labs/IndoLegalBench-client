import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart, type BarGroup } from "./BarChart";

const groups: BarGroup[] = [
  {
    label: "Veritask",
    bars: [
      { series: "deterministic", value: 0.85 },
      { series: "llm", value: 0.5 },
    ],
  },
  {
    label: "Justisio",
    bars: [
      { series: "deterministic", value: 0.3333 },
      { series: "llm", value: null },
    ],
  },
];

describe("BarChart", () => {
  it("names each group and gives every bar an accessible value", () => {
    render(<BarChart groups={groups} />);

    const veritask = screen.getByRole("group", { name: "Veritask" });
    expect(within(veritask).getByRole("img", { name: "Deterministic score 0.85" })).toBeInTheDocument();
    expect(within(veritask).getByRole("img", { name: "LLM judge score 0.50" })).toBeInTheDocument();
  });

  it("sizes each bar to its score and colours it by series", () => {
    render(<BarChart groups={groups} />);

    const deterministic = screen.getByRole("img", { name: "Deterministic score 0.85" });
    const fill = deterministic.firstElementChild as HTMLElement;
    expect(fill).toHaveStyle({ width: "85%" });
    expect(fill).toHaveClass("bg-chart-deterministic");
    const llm = screen.getByRole("img", { name: "LLM judge score 0.50" }).firstElementChild as HTMLElement;
    expect(llm).toHaveClass("bg-chart-llm");
    expect(llm).toHaveStyle({ width: "50%" });
  });

  it("shows a dash and no fill when a score is missing", () => {
    render(<BarChart groups={groups} />);

    const missing = screen.getByRole("img", { name: "LLM judge score –" });
    expect(missing.firstElementChild).toHaveStyle({ width: "0%" });
  });

  it("prints the legend and the 0 to 1 axis", () => {
    render(<BarChart groups={groups} />);

    expect(screen.getByText("Deterministic score", { selector: "li *, li" })).toBeInTheDocument();
    expect(screen.getByText("LLM judge score", { selector: "li *, li" })).toBeInTheDocument();
    for (const tick of ["0.00", "0.25", "0.50", "0.75", "1.00"]) {
      expect(screen.getAllByText(tick).length).toBeGreaterThan(0);
    }
  });

  it("renders nothing when there are no groups so the page can show its empty state", () => {
    const { container } = render(<BarChart groups={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
