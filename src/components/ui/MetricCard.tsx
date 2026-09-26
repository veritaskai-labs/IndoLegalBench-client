export interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  progressPercent?: number;
  sampleInfo?: string;
  note?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  progressPercent,
  sampleInfo,
  note,
  className = "",
}: MetricCardProps) {
const calculatedPercent = (() => {
    if (typeof progressPercent === "number") {
      return Math.min(Math.max(progressPercent, 0), 100);
    }

    // Check for fraction patterns (ex: "1/4 kasus", "3 / 10", "12/20 lolos")
    const fractionMatch = value.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
    if (fractionMatch) {
      const numerator = parseFloat(fractionMatch[1].replace(",", "."));
      const denominator = parseFloat(fractionMatch[2].replace(",", "."));
      if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
        const ratioPercent = (numerator / denominator) * 100;
        return Math.min(Math.max(ratioPercent, 0), 100);
      }
    }

    // Check for percentage patterns (ex: "78,4%", "62%")
    if (value.includes("%")) {
      const cleanNum = value.replace(",", ".").replace(/[^0-9.]/g, "");
      if (cleanNum) {
        const parsed = parseFloat(cleanNum);
        return isNaN(parsed) ? null : Math.min(Math.max(parsed, 0), 100);
      }
    }
    return null;
  })();

  const isNegativeDelta = delta?.trim().startsWith("-");

  return (
    <div
      className={`bg-white border border-slate-200 rounded p-4 flex flex-col justify-between text-xs ${className}`}
    >
      <div>
        <p className="text-slate-600 font-medium mb-1">{label}</p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </span>
          {delta && (
            <span
              className={`text-xs font-semibold ${
                isNegativeDelta ? "text-rose-700" : "text-emerald-700"
              }`}
            >
              {delta}
            </span>
          )}
        </div>

        {calculatedPercent !== null && (
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              data-testid="metric-progress-bar"
              className="bg-teal-700 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${calculatedPercent}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1 text-slate-500 font-mono text-[11px]">
        {sampleInfo && <p>{sampleInfo}</p>}
        {note && <p className="text-slate-400">{note}</p>}
      </div>
    </div>
  );
}
