// SCRUM-254 reads the clocks SCRUM-251 already returns. The logout instant is the
// earlier of the idle deadline and the absolute cap. A fixed 30-minute clock
// would leave the page up after the cap.

export const WARNING_LEAD_MS = 60_000;
export const RENEWAL_MIN_INTERVAL_MS = 60_000;
export const ACTIVITY_HEADER = "X-Veritask-Activity";
export const PASSIVE_ACTIVITY = "passive";
export const IDLE_DEADLINE_HEADER = "X-Veritask-Idle-Deadline";
export const ABSOLUTE_EXPIRES_HEADER = "X-Veritask-Absolute-Expires-At";
export const SESSION_CLOCK_STORAGE_KEY = "veritask.sessionClock";

export type SessionDeadlines = {
  idleDeadline: string;
  absoluteExpires: string;
};

export type ClockPhase = "pending" | "active" | "warning" | "expired";

type SharedRecord = {
  absoluteExpires: string;
  idleDeadline: string;
  lost: boolean;
};

type ClockState = {
  deadlines: SessionDeadlines | null;
  lostAbsolute: string | null;
};

let state: ClockState = { deadlines: null, lostAbsolute: null };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseInstant(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function readShared(): SharedRecord | null {
  const raw = storage()?.getItem(SESSION_CLOCK_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SharedRecord>;
    if (
      typeof parsed.absoluteExpires !== "string" ||
      typeof parsed.idleDeadline !== "string" ||
      typeof parsed.lost !== "boolean"
    ) {
      return null;
    }
    return {
      absoluteExpires: parsed.absoluteExpires,
      idleDeadline: parsed.idleDeadline,
      lost: parsed.lost,
    };
  } catch {
    return null;
  }
}

function writeShared(record: SharedRecord | null): void {
  const bin = storage();
  if (!bin) return;
  if (record === null) {
    bin.removeItem(SESSION_CLOCK_STORAGE_KEY);
    return;
  }
  bin.setItem(SESSION_CLOCK_STORAGE_KEY, JSON.stringify(record));
}

function ensureHydrated(): void {
  if (state.lostAbsolute !== null || state.deadlines !== null) return;
  const peer = readShared();
  if (peer?.lost) state.lostAbsolute = peer.absoluteExpires;
}

/** Idle deadline, capped so it cannot outlive the absolute expiry. */
function clampIdle(idle: string, absolute: string): string {
  const idleMs = parseInstant(idle);
  const absoluteMs = parseInstant(absolute);
  if (idleMs === null || absoluteMs === null) return idle;
  return idleMs <= absoluteMs ? idle : absolute;
}

/** Keep the later server idle deadline. An older in-flight response must not roll a renewal back. */
function laterIdle(current: string, incoming: string, absolute: string): string {
  const capped = clampIdle(incoming, absolute);
  const currentMs = parseInstant(current);
  const cappedMs = parseInstant(capped);
  if (currentMs === null || cappedMs === null) return capped;
  return cappedMs > currentMs ? capped : current;
}

export function resetSessionClock(): void {
  state = { deadlines: null, lostAbsolute: null };
  listeners.clear();
  writeShared(null);
}

export function subscribeSessionClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function currentDeadlines(): SessionDeadlines | null {
  return state.deadlines;
}

export function lostAbsoluteExpires(): string | null {
  return state.lostAbsolute;
}

export function earlierDeadlineMs(deadlines: SessionDeadlines): number | null {
  const idle = parseInstant(deadlines.idleDeadline);
  const absolute = parseInstant(deadlines.absoluteExpires);
  if (idle === null || absolute === null) return null;
  return Math.min(idle, absolute);
}

export function phaseAt(deadlines: SessionDeadlines | null, now: number): ClockPhase {
  if (!deadlines) return "pending";
  const end = earlierDeadlineMs(deadlines);
  if (end === null) return "expired";
  if (now >= end) return "expired";
  if (now >= end - WARNING_LEAD_MS) return "warning";
  return "active";
}

export function clockPhase(now: number): ClockPhase {
  if (state.lostAbsolute !== null) {
    if (!state.deadlines || state.deadlines.absoluteExpires === state.lostAbsolute) return "expired";
  }
  return phaseAt(state.deadlines, now);
}

export function isDeliberateActivity(event: { isTrusted: boolean; type: string }): boolean {
  if (!event.isTrusted) return false;
  return event.type === "pointerdown" || event.type === "keydown" || event.type === "wheel";
}

export function renewalDue(lastStartedAt: number | null, now: number, phase: ClockPhase): boolean {
  if (phase !== "active") return false;
  if (lastStartedAt === null) return true;
  return now - lastStartedAt >= RENEWAL_MIN_INTERVAL_MS;
}

export function readDeadlineHeaders(
  headers: { get(name: string): string | null },
): SessionDeadlines | "absent" | "invalid" {
  const idle = headers.get(IDLE_DEADLINE_HEADER);
  const absolute = headers.get(ABSOLUTE_EXPIRES_HEADER);
  if (idle === null && absolute === null) return "absent";
  if (parseInstant(idle) === null || parseInstant(absolute) === null || idle === null || absolute === null) {
    return "invalid";
  }
  return { idleDeadline: idle, absoluteExpires: absolute };
}

export function observeServerDeadlines(
  headers: { get(name: string): string | null },
): "absent" | "invalid" | "rejected" | "updated" {
  ensureHydrated();
  const read = readDeadlineHeaders(headers);
  if (read === "absent") return "absent";
  if (read === "invalid") {
    const absolute = headers.get(ABSOLUTE_EXPIRES_HEADER);
    if (absolute && parseInstant(absolute) !== null) {
      state.deadlines = { idleDeadline: "invalid", absoluteExpires: absolute };
      state.lostAbsolute = absolute;
    } else if (state.lostAbsolute === null) {
      state.lostAbsolute = state.deadlines?.absoluteExpires ?? "invalid";
    }
    emit();
    return "invalid";
  }

  if (state.lostAbsolute !== null) {
    const ended = parseInstant(state.lostAbsolute);
    const incoming = parseInstant(read.absoluteExpires);
    const newerLogin = ended !== null && incoming !== null && incoming > ended;
    if (!newerLogin) return "rejected";
    state.lostAbsolute = null;
  }

  const idleDeadline =
    state.deadlines?.absoluteExpires === read.absoluteExpires
      ? laterIdle(state.deadlines.idleDeadline, read.idleDeadline, read.absoluteExpires)
      : clampIdle(read.idleDeadline, read.absoluteExpires);
  let merged: SessionDeadlines = { idleDeadline, absoluteExpires: read.absoluteExpires };
  const peer = readShared();
  if (peer && !peer.lost && peer.absoluteExpires === merged.absoluteExpires) {
    merged = {
      ...merged,
      idleDeadline: laterIdle(merged.idleDeadline, peer.idleDeadline, merged.absoluteExpires),
    };
  }
  state.deadlines = merged;
  if (!(peer?.lost && peer.absoluteExpires === merged.absoluteExpires)) {
    writeShared({ ...merged, lost: false });
  }
  emit();
  return "updated";
}

/** @returns true the first time this login is marked ended. */
export function markLost(): boolean {
  const absolute = state.deadlines?.absoluteExpires;
  if (!absolute) return false;
  if (state.lostAbsolute === absolute) return false;
  state.lostAbsolute = absolute;
  writeShared({
    absoluteExpires: absolute,
    idleDeadline: state.deadlines?.idleDeadline ?? absolute,
    lost: true,
  });
  emit();
  return true;
}

export function applyPeerRecord(raw: string | null): "ignored" | "lost" | "updated" {
  if (!raw) return "ignored";
  let parsed: Partial<SharedRecord>;
  try {
    parsed = JSON.parse(raw) as Partial<SharedRecord>;
  } catch {
    return "ignored";
  }
  if (
    typeof parsed.absoluteExpires !== "string" ||
    typeof parsed.idleDeadline !== "string" ||
    typeof parsed.lost !== "boolean"
  ) {
    return "ignored";
  }

  const ours = state.deadlines;
  if (ours && parsed.absoluteExpires !== ours.absoluteExpires) return "ignored";

  if (parsed.lost) {
    if (state.lostAbsolute === parsed.absoluteExpires) return "ignored";
    if (!ours) {
      state.lostAbsolute = parsed.absoluteExpires;
      emit();
      return "lost";
    }
    return markLost() ? "lost" : "ignored";
  }

  if (!ours || state.lostAbsolute === ours.absoluteExpires) return "ignored";
  const idleDeadline = laterIdle(ours.idleDeadline, parsed.idleDeadline, ours.absoluteExpires);
  if (idleDeadline === ours.idleDeadline) return "ignored";
  state.deadlines = { ...ours, idleDeadline };
  writeShared({ ...state.deadlines, lost: false });
  emit();
  return "updated";
}
