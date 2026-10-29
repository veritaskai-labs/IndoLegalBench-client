import type { components } from "@/lib/generated/api";

export type Role = components["schemas"]["Role"];
export type Me = components["schemas"]["MeResponse"];

/**Role Label (Interface) */
export const ROLE_LABEL: Record<Role, string> = {
  contributor: "Kontributor",
  admin: "Admin",
  viewer: "Pembaca",
  developer_ai: "Developer AI",
};