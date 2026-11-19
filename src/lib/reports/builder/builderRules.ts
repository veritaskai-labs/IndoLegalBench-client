import type { Role } from "@/types";
import type { ScoreScope } from "./builderTypes";

export function allowedScoreScopes(role: Role | null): readonly ScoreScope[] {
  void role;
  return [];
}

export function canChooseProductLabel(role: Role | null): boolean {
  void role;
  return false;
}
