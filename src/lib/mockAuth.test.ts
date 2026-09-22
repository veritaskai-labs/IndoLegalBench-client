import { afterEach, describe, expect, it, vi } from "vitest";

/** mockAuth baca env saat di-import, jadi harus di-load ulang tiap test */
async function loadMockAuth() {
  vi.resetModules();
  return import("./mockAuth");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mockAuth", () => {
  it("stays off outside development even if the flag is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_MOCK_AUTH", "true");

    const { MOCK_ENABLED } = await loadMockAuth();

    expect(MOCK_ENABLED).toBe(false);
  });

  it("turns on in development when the flag is set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_MOCK_AUTH", "true");

    const { MOCK_ENABLED } = await loadMockAuth();

    expect(MOCK_ENABLED).toBe(true);
  });

  it("stays off in development without the flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_MOCK_AUTH", "false");

    const { MOCK_ENABLED } = await loadMockAuth();

    expect(MOCK_ENABLED).toBe(false);
  });

  it("reads the role case-insensitively", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_ROLE", "ADMIN");

    const { getMockMe } = await import("./mockAuth");

    expect(getMockMe().role).toBe("admin");
  });

  it("falls back to author for an unknown role", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_ROLE", "superuser");

    const { getMockMe } = await import("./mockAuth");

    expect(getMockMe().role).toBe("author");
  });
});