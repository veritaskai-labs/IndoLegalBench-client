import type { Me, Role } from "@/types";

export const MOCK_ENABLED = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

export const mockMe: Me = {
  id: "u-mock",
  name: "Nama User",
  email: "namauser@veritask.id",
  role: (process.env.NEXT_PUBLIC_MOCK_ROLE as Role) ?? "AUTHOR",
};