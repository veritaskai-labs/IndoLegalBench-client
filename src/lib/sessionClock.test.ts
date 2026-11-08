import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, onUnauthorized } from "@/lib/apiClient";
import {
  ABSOLUTE_EXPIRES_HEADER,
  IDLE_DEADLINE_HEADER,
  RENEWAL_MIN_INTERVAL_MS,
  SESSION_CLOCK_STORAGE_KEY,
  WARNING_LEAD_MS,
  applyPeerRecord,
  clockPhase,
  currentDeadlines,
  isDeliberateActivity,
  lostAbsoluteExpires,
  markLost,
  observeServerDeadlines,
  phaseAt,
  renewalDue,
  resetSessionClock,
  type SessionDeadlines,
} from "./sessionClock";

// SCRUM-254. The server already publishes both deadlines (SCRUM-251). The client
// warns 60 seconds before the earlier one and must not invent a longer clock.

const ABSOLUTE = "2026-11-08T12:00:00.000Z";
const IDLE = "2026-11-08T10:30:00.000Z";
const IDLE_LATER = "2026-11-08T11:00:00.000Z";
const NEXT_LOGIN = "2026-11-08T18:00:00.000Z";

function headerMap(values: Record<string, string | null>): { get(name: string): string | null } {
  return { get: (name) => (name in values ? values[name] : null) };
}

function deadlines(idleDeadline: string, absoluteExpires: string): SessionDeadlines {
  return { idleDeadline, absoluteExpires };
}

beforeEach(() => {
  resetSessionClock();
  localStorage.clear();
});

afterEach(() => {
  resetSessionClock();
  localStorage.clear();
});

describe("phaseAt", () => {
  const window = deadlines(IDLE, ABSOLUTE);

  it("stays pending until a server deadline exists", () => {
    expect(phaseAt(null, Date.parse(IDLE))).toBe("pending");
  });

  it("is active until 60 seconds before the earlier deadline", () => {
    const end = Date.parse(IDLE);
    expect(phaseAt(window, end - WARNING_LEAD_MS - 1)).toBe("active");
  });

  it("warns at 60 seconds before the earlier deadline", () => {
    const end = Date.parse(IDLE);
    expect(phaseAt(window, end - WARNING_LEAD_MS)).toBe("warning");
    expect(WARNING_LEAD_MS).toBe(60_000);
  });

  it("expires at the earlier deadline", () => {
    expect(phaseAt(window, Date.parse(IDLE))).toBe("expired");
  });

  // The absolute cap can arrive before the idle deadline. Counting the idle
  // header alone would leave the page up after the server has ended the session.
  it("uses the absolute cap when it is earlier than the idle deadline", () => {
    const capped = deadlines("2026-11-08T12:30:00.000Z", "2026-11-08T12:00:00.000Z");
    const end = Date.parse("2026-11-08T12:00:00.000Z");
    expect(phaseAt(capped, end - WARNING_LEAD_MS - 1)).toBe("active");
    expect(phaseAt(capped, end - WARNING_LEAD_MS)).toBe("warning");
    expect(phaseAt(capped, end)).toBe("expired");
  });

  it("treats an unparseable stored deadline as expired", () => {
    expect(phaseAt(deadlines("not-a-time", ABSOLUTE), Date.parse(IDLE))).toBe("expired");
  });
});

describe("observeServerDeadlines", () => {
  it("ignores a response that carries no deadline headers", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));

    expect(observeServerDeadlines(headerMap({}))).toBe("absent");
    expect(currentDeadlines()).toEqual(deadlines(IDLE, ABSOLUTE));
  });

  it("rejects a deadline header that is not a time", () => {
    expect(
      observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: "soon", [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE })),
    ).toBe("invalid");
    expect(clockPhase(Date.parse(IDLE))).toBe("expired");
  });

  it("does not extend the idle deadline when a later response sends an earlier one", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE_LATER, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));

    expect(currentDeadlines()?.idleDeadline).toBe(IDLE_LATER);
  });

  it("adopts a later idle deadline from the server for the same login", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));
    expect(observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE_LATER, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }))).toBe(
      "updated",
    );

    expect(currentDeadlines()?.idleDeadline).toBe(IDLE_LATER);
  });

  it("does not let the idle deadline pass the absolute cap", () => {
    observeServerDeadlines(
      headerMap({ [IDLE_DEADLINE_HEADER]: "2026-11-08T13:00:00.000Z", [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }),
    );

    expect(currentDeadlines()?.idleDeadline).toBe(ABSOLUTE);
    expect(phaseAt(currentDeadlines(), Date.parse(ABSOLUTE))).toBe("expired");
  });

  it("rejects a late success for the login that already ended", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));
    expect(markLost()).toBe(true);
    expect(markLost()).toBe(false);

    expect(
      observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE_LATER, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE })),
    ).toBe("rejected");
    expect(currentDeadlines()?.idleDeadline).toBe(IDLE);
  });

  it("accepts a newer absolute expiry as a new login", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));
    markLost();

    expect(
      observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: "2026-11-08T18:30:00.000Z", [ABSOLUTE_EXPIRES_HEADER]: NEXT_LOGIN })),
    ).toBe("updated");
    expect(lostAbsoluteExpires()).toBeNull();
    expect(currentDeadlines()?.absoluteExpires).toBe(NEXT_LOGIN);
  });
});

describe("tabs", () => {
  it("ignores a record from a different absolute expiry", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));

    expect(
      applyPeerRecord(JSON.stringify({ absoluteExpires: NEXT_LOGIN, idleDeadline: IDLE_LATER, lost: true })),
    ).toBe("ignored");
    expect(clockPhase(Date.parse("2026-11-08T10:00:00.000Z"))).toBe("active");
  });

  it("adopts a later idle deadline published by another tab of this login", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));

    expect(applyPeerRecord(JSON.stringify({ absoluteExpires: ABSOLUTE, idleDeadline: IDLE_LATER, lost: false }))).toBe(
      "updated",
    );
    expect(currentDeadlines()?.idleDeadline).toBe(IDLE_LATER);
  });

  it("does not let an earlier peer deadline shorten a renewal", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE_LATER, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));

    expect(applyPeerRecord(JSON.stringify({ absoluteExpires: ABSOLUTE, idleDeadline: IDLE, lost: false }))).toBe("ignored");
    expect(currentDeadlines()?.idleDeadline).toBe(IDLE_LATER);
  });

  it("ends this login when another tab marks it lost, and ignores a deadline that follows", () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));

    expect(applyPeerRecord(JSON.stringify({ absoluteExpires: ABSOLUTE, idleDeadline: IDLE_LATER, lost: true }))).toBe("lost");
    expect(applyPeerRecord(JSON.stringify({ absoluteExpires: ABSOLUTE, idleDeadline: IDLE_LATER, lost: false }))).toBe(
      "ignored",
    );
    expect(lostAbsoluteExpires()).toBe(ABSOLUTE);
  });

  it("remembers a lost login that was written before this tab read /me", () => {
    localStorage.setItem(
      SESSION_CLOCK_STORAGE_KEY,
      JSON.stringify({ absoluteExpires: ABSOLUTE, idleDeadline: IDLE, lost: true }),
    );

    expect(observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE_LATER, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }))).toBe(
      "rejected",
    );
  });
});

describe("deliberate activity", () => {
  it.each(["pointerdown", "keydown", "wheel"])("counts a trusted %s", (type) => {
    expect(isDeliberateActivity({ isTrusted: true, type })).toBe(true);
  });

  it.each(["pointermove", "mousemove", "scroll", "focus", "visibilitychange"])("ignores %s", (type) => {
    expect(isDeliberateActivity({ isTrusted: true, type })).toBe(false);
  });

  it("ignores an untrusted event", () => {
    expect(isDeliberateActivity({ isTrusted: false, type: "pointerdown" })).toBe(false);
  });

  it("renews only while the session is active, and at most once a minute", () => {
    expect(renewalDue(null, 0, "active")).toBe(true);
    expect(renewalDue(0, RENEWAL_MIN_INTERVAL_MS - 1, "active")).toBe(false);
    expect(renewalDue(0, RENEWAL_MIN_INTERVAL_MS, "active")).toBe(true);
    expect(RENEWAL_MIN_INTERVAL_MS).toBe(60_000);
    expect(renewalDue(null, 0, "warning")).toBe(false);
    expect(renewalDue(null, 0, "pending")).toBe(false);
    expect(renewalDue(null, 0, "expired")).toBe(false);
  });
});

describe("apiFetch and a lost login", () => {
  const fetchMock = vi.fn();
  const unsubscribers: Array<() => void> = [];

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    while (unsubscribers.length > 0) unsubscribers.pop()?.();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  function json(deadlinesForBody: SessionDeadlines, body: unknown) {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        [IDLE_DEADLINE_HEADER]: deadlinesForBody.idleDeadline,
        [ABSOLUTE_EXPIRES_HEADER]: deadlinesForBody.absoluteExpires,
      },
    });
  }

  it("drops a late 200 for the absolute expiry that already ended", async () => {
    const listener = vi.fn();
    unsubscribers.push(onUnauthorized(listener));
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));
    markLost();
    fetchMock.mockResolvedValue(json(deadlines(IDLE_LATER, ABSOLUTE), { name: "back" }));

    await expect(apiFetch("/cases")).rejects.toMatchObject({ status: 401, code: "SESSION_EXPIRED" });
    expect(listener).toHaveBeenCalledWith("expired");
  });

  it("returns the body when the absolute expiry is a newer login", async () => {
    observeServerDeadlines(headerMap({ [IDLE_DEADLINE_HEADER]: IDLE, [ABSOLUTE_EXPIRES_HEADER]: ABSOLUTE }));
    markLost();
    fetchMock.mockResolvedValue(json(deadlines("2026-11-08T18:30:00.000Z", NEXT_LOGIN), { name: "new" }));

    await expect(apiFetch("/me")).resolves.toEqual({ name: "new" });
    expect(lostAbsoluteExpires()).toBeNull();
  });
});
