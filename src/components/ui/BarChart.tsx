import { barWidthPercent, formatScore } from "@/lib/ui/barChart";

export type BarSeries = "deterministic" | "llm";

export type BarGroup = {
  label: string;
  bars: { series: BarSeries; value: number | null }[];
};

// One row per series: a new score type is a new entry, the chart itself does not change.
const SERIES: Record<BarSeries, { label: string; fill: string; swatch: string }> = {
  deterministic: {
    label: "Deterministic score",
    fill: "bg-chart-deterministic",
    swatch: "bg-chart-deterministic",
  },
  llm: { label: "LLM judge score", fill: "bg-chart-llm", swatch: "bg-chart-llm" },
};

const AXIS = ["0.00", "0.25", "0.50", "0.75", "1.00"];

/** Horizontal score bars as drawn in the prototype: one group per product, one bar per score series. */
export function BarChart({ groups }: Readonly<{ groups: readonly BarGroup[] }>) {
  if (groups.length === 0) return null;
  const legend = [...new Set(groups.flatMap((group) => group.bars.map((bar) => bar.series)))];

  return (
    <div>
      <ul className="mb-4 flex list-none gap-5 p-0 text-[13px] text-ink-soft">
        {legend.map((series) => (
          <li key={series} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-3 rounded-[2px] ${SERIES[series].swatch}`} />
            {SERIES[series].label}
          </li>
        ))}
      </ul>
      <div className="relative ml-[120px] mr-12">
        {groups.map((group) => (
          <div key={group.label} role="group" aria-label={group.label} className="relative mb-5">
            <div className="absolute -left-[120px] top-1/2 w-[108px] -translate-y-1/2 text-sm font-semibold">
              {group.label}
            </div>
            {group.bars.map((bar) => {
              const display = formatScore(bar.value);
              const { label, fill } = SERIES[bar.series];
              return (
                <div key={bar.series} className="my-1 flex items-center">
                  <div
                    role="img"
                    aria-label={`${label} ${display}`}
                    className="relative h-3.5 flex-1 rounded-[2px] bg-surface"
                  >
                    <div
                      className={`absolute inset-y-0 left-0 rounded-[2px] ${fill}`}
                      style={{ width: `${bar.value === null ? 0 : barWidthPercent(bar.value)}%` }}
                    />
                  </div>
                  <span aria-hidden="true" className="absolute -right-11 text-[13px]">
                    {display}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        <div aria-hidden="true" className="flex justify-between text-xs text-muted">
          {AXIS.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
