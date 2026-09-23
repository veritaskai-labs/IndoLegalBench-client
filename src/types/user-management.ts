import type { Role } from "@/types";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  role: Role;
}

export interface UserUpdateRoleRequest {
  role: Role;
}

export type StatusFilter = "all" | "active" | "inactive";