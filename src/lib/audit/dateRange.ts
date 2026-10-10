/** Catatan audit dihapus setelah 90 hari, jadi filter di luar itu tidak ada gunanya. */
export const RETENTION_DAYS = 90;

export type DateRange = {
  from: string;
  to: string;
  clamped: boolean;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function clampDateRange(
  from: string | null,
  to: string | null,
  today: Date,): DateRange {
    
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