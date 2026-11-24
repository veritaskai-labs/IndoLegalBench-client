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
    const bar = within(veritask).getByRole("meter", { name: "Deterministic score 0.85" });
    expect(bar).toHaveAttribute("value", "0.85");
    expect(bar).toHaveAttribute("min", "0");
    expect(bar).toHaveAttribute("max", "1");
    expect(within(veritask).getByRole("meter", { name: "LLM judge score 0.50" })).toBeInTheDocument();
  });

  it("sizes each bar to its score and colours it by series", () => {
    render(<BarChart groups={groups} />);

    const fill = screen.getByTestId("fill-Veritask-deterministic");
    expect(fill).toHaveStyle({ width: "85%" });
    expect(fill).toHaveClass("bg-chart-deterministic");
    const llm = screen.getByTestId("fill-Veritask-llm");
    expect(llm).toHaveClass("bg-chart-llm");
    expect(llm).toHaveStyle({ width: "50%" });
  });

  it("shows a dash and no fill when a score is missing", () => {
    render(<BarChart groups={groups} />);

    expect(screen.getByText("LLM judge score –", { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.queryByRole("meter", { name: "LLM judge score –" })).toBeNull();
    expect(screen.getByTestId("fill-Justisio-llm")).toHaveStyle({ width: "0%" });
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
