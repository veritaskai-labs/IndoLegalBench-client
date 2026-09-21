import type { Role } from "@/types";

export type NavItem = { label: string; href: string; roles: Role[] };
export type NavGroup = { heading: string; items: NavItem[] };

const ALL: Role[] = ["AUTHOR", "REVIEWER", "ADMIN", "VIEWER"];

/** Mockup 5.2 beda, nunggu SCRUM-97 */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Konteks",
    items: [
      { label: "Dasbor", href: "/dashboard", roles: ALL },
      { label: "Suite dan kasus", href: "/suites", roles: ALL },
      {
        label: "Antrean tinjauan",
        href: "/reviews",
        roles: ["REVIEWER", "ADMIN"],
      },
    ],
  },
  {
    heading: "Pengukuran",
    items: [
      { label: "Penyedia", href: "/admin/providers", roles: ["ADMIN"] },
      { label: "Eksekusi", href: "/runs", roles: ["ADMIN"] },
      { label: "Laporan", href: "/reports", roles: ["ADMIN", "VIEWER"] },
    ],
  },
  {
    heading: "Sistem",
    items: [
      { label: "Anggota", href: "/admin/members", roles: ["ADMIN"] },
      { label: "Log audit", href: "/admin/audit", roles: ["ADMIN"] },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}