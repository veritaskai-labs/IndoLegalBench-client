import type { components } from "@/lib/generated/api";

export type Role = components["schemas"]["Role"];
export type Me = components["schemas"]["Me"];

/**Role Label (Interface) */
export const ROLE_LABEL: Record<Role, string> = {
  author: "Penulis",
  reviewer: "Peninjau",
  admin: "Admin",
  viewer: "Pembaca",
};