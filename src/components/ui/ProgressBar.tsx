const BAR =
  "block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-surface [&::-webkit-progress-bar]:bg-surface [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent";

/** Bilah progres tipis untuk sel tabel. Nilai dibulatkan, dan nilai di luar 0 sampai 100 dipotong ke batasnya. */
export function ProgressBar({
  percent,
  label,
  className = "",
}: Readonly<{ percent: number; label: string; className?: string }>) {
  const value = Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent))) : 0;
  return <progress value={value} max={100} aria-label={label} className={`${BAR} ${className}`.trim()} />;
}
