export interface ProviderCardProps {
  name: string;
  rpm: number;
  version: string;
  tosReviewed?: boolean;
  keyEncrypted?: boolean;
  className?: string;
}

export function ProviderCard({
  name,
  rpm,
  version,
  tosReviewed = false,
  keyEncrypted = false,
  className = "",
}: ProviderCardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded p-4 flex flex-col justify-between text-xs ${className}`}
    >
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
              <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
              <line x1="6" x2="6.01" y1="6" y2="6" />
              <line x1="6" x2="6.01" y1="18" y2="18" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{name}</h4>
            <p className="font-mono text-slate-500 text-[11px]">
              {rpm} rpm · {version}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {tosReviewed && (
            <div>
              <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium text-[11px]">
                ToS reviewed
              </span>
            </div>
          )}
          {keyEncrypted && (
            <div>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-[11px]">
                key encrypted
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
