import { describe, expect, it } from "vitest";

import { describeAttemptTiming } from "./attemptTiming";

type Stamps = { started_at: string | null; finished_at: string | null };

function stamps(overrides: Partial<Stamps> = {}): Stamps {
  return { started_at: null, finished_at: null, ...overrides };
}

describe("describeAttemptTiming (PBI-11 AC8, timestamp per percobaan)", () => {
  // Positive
  it("shows start and finish in WIB with the duration", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-11-03T03:00:00Z", finished_at: "2026-11-03T03:00:42Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing).toEqual({
      started: "03 Nov 2026, 10.00 WIB",
      finished: "03 Nov 2026, 10.00 WIB",
      duration: "42 dtk",
    });
  });

  it("writes minutes and seconds when the call took longer than a minute", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-11-03T03:00:00Z", finished_at: "2026-11-03T03:02:05Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.duration).toBe("2 mnt 5 dtk");
  });

  it("writes whole minutes without a seconds part", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-11-03T03:00:00Z", finished_at: "2026-11-03T03:03:00Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.duration).toBe("3 mnt");
  });

  it("reads a retried attempt the same way, using its new timestamps", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-11-04T10:00:00+07:00", finished_at: "2026-11-04T10:00:10+07:00" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.started).toBe("04 Nov 2026, 10.00 WIB");
    expect(timing.duration).toBe("10 dtk");
  });

  // Edge
  it("shows 0 dtk when start and finish are the same instant", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-11-03T03:00:00Z", finished_at: "2026-11-03T03:00:00Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.duration).toBe("0 dtk");
  });

  it("moves to the next WIB day when the call finishes after midnight WIB", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-12-31T16:59:50Z", finished_at: "2026-12-31T17:00:10Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.started).toBe("31 Des 2026, 23.59 WIB");
    expect(timing.finished).toBe("01 Jan 2027, 00.00 WIB");
    expect(timing.duration).toBe("20 dtk");
  });

  // Negative: data lama, belum jalan, atau coba ulang dibuka kembali
  it("says the attempt has not started when both timestamps are null", () => {
    // Arrange
    const attempt = stamps();

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing).toEqual({ started: "Belum dimulai", finished: "Belum selesai", duration: null });
  });

  it("keeps the start and says not finished while the call is still running", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-11-03T03:00:00Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.started).toBe("03 Nov 2026, 10.00 WIB");
    expect(timing.finished).toBe("Belum selesai");
    expect(timing.duration).toBeNull();
  });

  it("hides the duration when finish is earlier than start", () => {
    // Arrange
    const attempt = stamps({ started_at: "2026-11-03T03:00:42Z", finished_at: "2026-11-03T03:00:00Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.duration).toBeNull();
    expect(timing.finished).toBe("03 Nov 2026, 10.00 WIB");
  });

  it("hides the duration instead of showing NaN when a timestamp is not a date", () => {
    // Arrange
    const attempt = stamps({ started_at: "bukan tanggal", finished_at: "2026-11-03T03:00:00Z" });

    // Act
    const timing = describeAttemptTiming(attempt);

    // Assert
    expect(timing.started).toBe("bukan tanggal");
    expect(timing.duration).toBeNull();
  });
});
