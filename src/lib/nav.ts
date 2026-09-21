import type { Role } from "@/types";

export type NavItem = { label: string; href: string; roles: Role[] };
export type NavGroup = { heading: string; items: NavItem[] };

const ALL: Role[] = ["author", "reviewer", "admin", "viewer"];

/** Mockup, nunggu SCRUM-97 */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Konteks",
    items: [
      { label: "Dasbor", href: "/dashboard", roles: ALL },
      { label: "Suite dan kasus", href: "/suites", roles: ALL },
      {
        label: "Antrean tinjauan",
        href: "/reviews",
        roles: ["reviewer", "admin"],
      },
    ],
  },
  {
    heading: "Pengukuran",
    items: [
      { label: "Penyedia", href: "/admin/providers", roles: ["admin"] },
      { label: "Eksekusi", href: "/runs", roles: ["admin"] },
      { label: "Laporan", href: "/reports", roles: ["admin", "viewer"] },
    ],
  },
  {
    heading: "Sistem",
    items: [
      { label: "Anggota", href: "/admin/members", roles: ["admin"] },
      { label: "Log audit", href: "/admin/audit", roles: ["admin"] },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}