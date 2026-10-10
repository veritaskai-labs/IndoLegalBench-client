import type { Role } from "@/types";

export function canCreateSnapshot(role: Role | null): boolean {
  void role;
  return false;
}
