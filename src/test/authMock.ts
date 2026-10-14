import type { Role } from "@/types";

/**
 * Pengganti useAuth untuk test. Pasang dengan
 *   vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));
 * lalu atur session.role. null berarti sesi masih dimuat.
 */
export const session: { role: Role | null } = { role: null };

export function useAuth() {
  return session.role === null
    ? { status: "loading" as const }
    : {
        status: "authenticated" as const,
        user: { id: "u1", name: "Aileen", email: "a@veritask.id", role: session.role },
      };
}
