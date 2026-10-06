/** Server mengirim UTC; pengguna membaca dalam WIB. */
const WIB_OFFSET_HOURS = 7;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatWib(isoTimestamp: string): string {
  const utc = new Date(isoTimestamp);
  if (Number.isNaN(utc.getTime())) return "—";

  const wib = new Date(utc.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
  const day = wib.getUTCDate();
  const month = MONTHS[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();

  return `${day} ${month} ${year}, ${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())} WIB`;
}