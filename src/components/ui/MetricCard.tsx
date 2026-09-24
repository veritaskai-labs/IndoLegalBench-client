import React from "react";

export interface MetricCardProps {
  label: string;
  value: string; // misal: "78,4%" atau "4,1 / 5"
  delta?: string; // misal: "+4,1 pt"
  progressPercent?: number; // 0 sampai 100
  sampleInfo?: string; // misal: "N=3 · suite v4 · test set (120 kasus)"
  note?: string; // misal: "error rate 2,1% dilaporkan terpisah"
  className?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  progressPercent = 78.4,
  sampleInfo,
  note,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded p-4 flex flex-col justify-between text-xs ${className}`}
    >
      <div>
        {/* Label Header */}
        <p className="text-slate-600 font-medium mb-1">{label}</p>

        {/* Nilai Besar & Delta */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </span>
          {delta && (
            <span className="text-xs font-semibold text-emerald-700">
              {delta}
            </span>
          )}
        </div>

        {/* Progress Bar Mini */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className="bg-teal-700 h-1.5 rounded-full"
            style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
          />
        </div>
      </div>

      {/* Info Sampel & Catatan Kaki */}
      <div className="space-y-1 text-slate-500 font-mono text-[11px]">
        {sampleInfo && <p>{sampleInfo}</p>}
        {note && <p className="text-slate-400">{note}</p>}
      </div>
    </div>
  );
}