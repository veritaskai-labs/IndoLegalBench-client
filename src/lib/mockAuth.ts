import type { Me, Role } from "@/types";

/** Mock sementara sampai endpoint SCRUM-90 jalan */
export const MOCK_ENABLED = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_MOCK_AUTH === "true";


const ROLES: readonly Role[] = ["author", "reviewer", "admin", "viewer"];

/** Type guard, cek runtime */
function isRole(value: string | undefined): value is Role {
  return value !== undefined && (ROLES as readonly string[]).includes(value);
}

/** Mock /me, baca env saat dipanggil */
export function getMockMe(): Me {
  const envRole = process.env.NEXT_PUBLIC_MOCK_ROLE?.toLowerCase();
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Nama User",
    email: "nama.user@veritask.id",
    role: isRole(envRole) ? envRole : "author",
  };
}


