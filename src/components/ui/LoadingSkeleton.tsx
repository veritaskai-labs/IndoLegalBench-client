import React from "react";

export interface LoadingSkeletonProps {
  variant?: "table" | "cards" | "lines";
  cardType?: "case" | "metric" | "provider" | "generic";
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = "lines",
  cardType = "case",
  rows = 3,
  columns = 5,
  className = "",
}: LoadingSkeletonProps) {
  // Table Skeleton
  if (variant === "table") {
    return (
      <>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className={`animate-pulse ${className}`}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className="py-4 px-6">
                <div
                  className="h-3.5 bg-slate-200 rounded"
                  style={{
                    width: colIndex === 0 ? "40%" : colIndex === 1 ? "75%" : "60%",
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  // Cards Skeleton
  if (variant === "cards") {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            data-testid="card-skeleton"
            className="animate-pulse bg-white border border-slate-200 rounded p-4 flex flex-col justify-between min-h-[148px]"
          >
            {cardType === "case" && (
              <>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="h-3.5 w-24 bg-slate-200 rounded font-mono" />
                  <div className="h-4 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="space-y-1.5 mb-4">
                  <div className="h-3.5 w-11/12 bg-slate-200 rounded" />
                  <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                    <div className="h-4 w-10 bg-slate-200 rounded" />
                  </div>
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                </div>
              </>
            )}

            {cardType === "metric" && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3.5 w-32 bg-slate-200 rounded" />
                  <div className="h-3.5 w-10 bg-slate-200 rounded" />
                </div>
                <div className="h-8 w-28 bg-slate-200 rounded my-2" />
                <div className="h-3 w-40 bg-slate-200 rounded mt-auto" />
              </>
            )}

            {cardType === "provider" && (
              <>
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="w-9 h-9 bg-slate-200 rounded shrink-0" />
                  <div className="space-y-1.5 w-full">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-20 bg-slate-200 rounded font-mono" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100">
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                </div>
              </>
            )}

            {cardType === "generic" && (
              <div className="space-y-3">
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
                <div className="h-3.5 w-full bg-slate-200 rounded" />
                <div className="h-3.5 w-2/3 bg-slate-200 rounded" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 3. Text Skeleton
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="animate-pulse flex items-center gap-4">
          <div className="h-4 bg-slate-200 rounded w-full" />
        </div>
      ))}
    </div>
  );
}