export const RETENTION_DAYS = 90;

export type DateRange = {
  from: string;
  to: string;
  clamped: boolean;
};

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function clampDateRange(from: string | null, to: string | null, today: Date): DateRange {
  const earliest = toIsoDate(shiftDays(today, -RETENTION_DAYS));
  const latest = toIsoDate(today);

  let start = from ?? earliest;
  let end = to ?? latest;

  if (start > end) [start, end] = [end, start];

  const clampedStart = start < earliest ? earliest : start;
  const clampedEnd = end > latest ? latest : end;

  return {
    from: clampedStart,
    to: clampedEnd,
    clamped: clampedStart !== start || clampedEnd !== end,
  };
}