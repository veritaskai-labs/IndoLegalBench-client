import type { components } from "@/lib/generated/api";

export type Role = components["schemas"]["Role"];
export type Me = components["schemas"]["Me"];

/**Role Label (Interface) */
export const ROLE_LABEL: Record<Role, string> = {
  AUTHOR: "Penulis",
  REVIEWER: "Peninjau",
  ADMIN: "Admin",
  VIEWER: "Pembaca",
};