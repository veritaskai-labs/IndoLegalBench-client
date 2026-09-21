import type { Me, Role } from "@/types";

/** Mock sementara sampai endpoint SCRUM-90 jalan */
export const MOCK_ENABLED = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_MOCK_AUTH === "true";


const ROLES: Role[] = ["author", "reviewer", "admin", "viewer"];
const envRole = process.env.NEXT_PUBLIC_MOCK_ROLE?.toLowerCase() as Role;

export const mockMe: Me = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Nama User",
  email: "nama.user@veritask.id",
  role: ROLES.includes(envRole) ? envRole : "author",
};


