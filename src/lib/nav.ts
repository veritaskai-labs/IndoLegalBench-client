import type { IconName } from "@/lib/icons";
import type { Role } from "@/types";

export type NavItem = { label: string; href: string; icon: IconName; roles: Role[] };
/** heading "" is the untitled first group, as in the prototype. */
export type NavGroup = { heading: string; items: NavItem[] };

// Developer AI tidak punya dasbor (server menjawab 403), jadi tidak masuk ALL.
const ALL: Role[] = ["contributor", "admin", "viewer"];

/** Menu dari prototipe yang disetujui (SCRUM-347): label dan urutannya mengikuti desain, alamatnya tetap. */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "",
    items: [{ label: "Beranda", href: "/dashboard", icon: "beranda", roles: ALL }],
  },
  {
    heading: "Persiapan",
    items: [
      {
        label: "Suite dan kasus",
        href: "/suites",
        icon: "suite",
        roles: ["contributor", "admin", "developer_ai"],
      },
      { label: "Antrean tinjauan", href: "/reviews", icon: "antrean", roles: ["contributor"] },
      { label: "Review kasus", href: "/admin/reviews", icon: "tinjauan", roles: ["admin"] },
      { label: "Rubrik penilaian", href: "/admin/rubrics", icon: "rubrik", roles: ["admin"] },
      { label: "Produk AI", href: "/admin/providers", icon: "produk", roles: ["admin"] },
    ],
  },
  {
    heading: "Pengukuran",
    items: [
      { label: "Pengukuran otomatis", href: "/runs", icon: "otomatis", roles: ["admin", "developer_ai"] },
      { label: "Pengukuran manual", href: "/manual-runs", icon: "manual", roles: ["admin", "contributor"] },
      {
        label: "Laporan",
        href: "/reports",
        icon: "laporan",
        roles: ["admin", "contributor", "viewer", "developer_ai"],
      },
    ],
  },
  {
    heading: "Pengaturan",
    items: [
      { label: "Pengguna", href: "/admin/members", icon: "pengguna", roles: ["admin"] },
      { label: "Riwayat aktivitas", href: "/admin/audit", icon: "riwayat", roles: ["admin"] },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

const isAtOrBelow = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Apakah item menu sedang aktif untuk alamat ini. Halaman detail menyalakan menu induknya; halaman kasus
 * tidak punya item sendiri, jadi ikut "Suite dan kasus" (SCRUM-341, SCRUM-340).
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  return isAtOrBelow(pathname, href) || (href === "/suites" && isAtOrBelow(pathname, "/cases"));
}
